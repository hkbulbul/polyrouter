-- 007: each banner targets one provider card

alter table public.embedding_providers
  add column if not exists provider_id text not null default ''
  check (provider_id = '' or provider_id ~ '^[a-z0-9][a-z0-9-]{0,62}$');

create index if not exists embedding_providers_provider_idx
  on public.embedding_providers(provider_id, position);
