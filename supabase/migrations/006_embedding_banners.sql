-- 006: banner slot (image/youtube/html)

alter table public.embedding_providers
  drop column if exists base_url;

alter table public.embedding_providers
  drop column if exists model;

alter table public.embedding_providers
  drop column if exists dimensions;

alter table public.embedding_providers
  add column if not exists href text not null default ''
  check (href = '' or href ~ '^https://');

alter table public.embedding_providers
  add column if not exists position int not null default 999
  check (position between 0 and 999);

create index if not exists embedding_providers_position_idx
  on public.embedding_providers(position, id);
