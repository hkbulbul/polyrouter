-- Run in Supabase SQL editor before deploying the ingest function.
create table if not exists public.installations (
  installation_id uuid primary key,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  app_version text
);

create table if not exists public.installation_events (
  event_id uuid primary key,
  installation_id uuid not null references public.installations(installation_id) on delete cascade,
  event_type text not null constraint installation_events_event_type_check check (event_type in ('installed', 'startup', 'setup_complete', 'dashboard_login')),
  occurred_at timestamptz not null,
  received_at timestamptz not null default now(),
  app_version text,
  ip_hash text
);

alter table public.installations enable row level security;
alter table public.installation_events enable row level security;

-- No policies are intentionally created for anon/authenticated roles. The Edge
-- Function uses the service role internally, so direct table reads/writes fail.
create unique index if not exists installation_events_installation_type_time_idx
  on public.installation_events (installation_id, event_type, occurred_at);
