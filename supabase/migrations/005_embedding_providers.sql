create table public.embedding_providers (
  id text primary key check (id ~ '^[a-z0-9][a-z0-9-]{0,62}$'),
  display_name text not null check (char_length(trim(display_name)) between 1 and 120),
  base_url text not null check (base_url ~ '^https://'),
  model text not null check (char_length(trim(model)) between 1 and 200),
  dimensions integer not null check (dimensions between 1 and 65536),
  enabled boolean not null default true,
  media_kind text check (media_kind in ('image', 'youtube', 'html')),
  media_content text,
  updated_at timestamptz not null default now(),
  check ((media_kind is null) = (media_content is null)),
  check (media_kind <> 'image' or media_content ~ '^https://'),
  check (media_kind <> 'youtube' or media_content ~ '^[A-Za-z0-9_-]{11}$')
);

alter table public.embedding_providers enable row level security;

create policy "enabled embedding providers are publicly readable"
  on public.embedding_providers for select
  to anon
  using (enabled);

create policy "authenticated users can read embedding providers"
  on public.embedding_providers for select
  to authenticated
  using (true);

create or replace function public.set_embedding_provider_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger embedding_providers_updated_at
before update on public.embedding_providers
for each row execute function public.set_embedding_provider_updated_at();
