-- Anonymous public npm-install telemetry. Run after 001/002.
-- Direct anon/authenticated access remains denied by RLS; only Edge Functions use service role.
create table if not exists public.public_installations (
  installation_id uuid primary key,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  app_version text
);

create table if not exists public.public_installation_events (
  event_id uuid primary key,
  installation_id uuid not null references public.public_installations(installation_id) on delete cascade,
  event_type text not null constraint public_installation_events_event_type_check
    check (event_type in ('installed', 'startup', 'setup_complete', 'dashboard_login')),
  occurred_at timestamptz not null,
  received_at timestamptz not null default now(),
  app_version text
);

-- Only short-lived IP hashes are stored for edge rate limiting, never raw IP addresses.
create table if not exists public.public_installation_telemetry_rate_limits (
  rate_key text primary key,
  bucket_start timestamptz not null,
  request_count integer not null default 1,
  expires_at timestamptz not null
);

alter table public.public_installations enable row level security;
alter table public.public_installation_events enable row level security;
alter table public.public_installation_telemetry_rate_limits enable row level security;

create index if not exists public_installation_events_received_at_idx
  on public.public_installation_events (received_at);
create index if not exists public_installation_telemetry_rate_limits_expires_at_idx
  on public.public_installation_telemetry_rate_limits (expires_at);

-- Called by a scheduled Supabase/pg_cron job in the official deployment.
create or replace function public.purge_public_installation_telemetry()
returns void
language sql
security definer
set search_path = public
as $$
  delete from public.public_installation_telemetry_rate_limits where expires_at < now();
  delete from public.public_installation_events where received_at < now() - interval '90 days';
  delete from public.public_installations where last_seen_at < now() - interval '90 days';
$$;

-- Atomic rate-limit counter used only by the service-role Edge Function.
create or replace function public.consume_public_installation_telemetry_rate_limit(
  p_rate_key text,
  p_bucket_start timestamptz,
  p_expires_at timestamptz,
  p_limit integer
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  current_count integer;
begin
  insert into public.public_installation_telemetry_rate_limits(rate_key, bucket_start, request_count, expires_at)
  values (p_rate_key, p_bucket_start, 1, p_expires_at)
  on conflict (rate_key) do update
    set request_count = case
      when public.public_installation_telemetry_rate_limits.bucket_start <> excluded.bucket_start then 1
      else public.public_installation_telemetry_rate_limits.request_count + 1
    end,
    bucket_start = excluded.bucket_start,
    expires_at = excluded.expires_at
  where public.public_installation_telemetry_rate_limits.bucket_start <> excluded.bucket_start
    or public.public_installation_telemetry_rate_limits.request_count < p_limit
  returning request_count into current_count;

  return current_count is not null;
end;
$$;

-- The official deployment must schedule this daily (pg_cron or an external scheduler):
-- select public.purge_public_installation_telemetry();
-- Do not grant execute on either function to anon or authenticated roles.
revoke all on function public.purge_public_installation_telemetry() from public;
revoke all on function public.consume_public_installation_telemetry_rate_limit(text, timestamptz, timestamptz, integer) from public;
grant execute on function public.purge_public_installation_telemetry() to service_role;
grant execute on function public.consume_public_installation_telemetry_rate_limit(text, timestamptz, timestamptz, integer) to service_role;
