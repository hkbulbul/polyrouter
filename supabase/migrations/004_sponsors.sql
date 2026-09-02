-- Sponsors: cloud source of truth for remote badge slots
-- Serves every PolyRouter install via anon SELECT; writes are service_role only.
-- Covers all kinds (llm, embedding, etc.) so Embedding is also cloud-driven.

create table if not exists public.sponsors (
  provider_id text not null,
  kind text not null default 'llm' check (kind in ('llm','embedding','image','tts','stt','video','search','fetch','music')),
  is_active boolean not null default true,
  position int not null default 999 check (position between 0 and 999),
  badge_label text not null default 'Sponsored' check (char_length(badge_label) between 1 and 32),
  badge_sublabel text not null default '' check (char_length(badge_sublabel) <= 32),
  href text not null default '' check (href = '' or href ~ '^https://'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (kind, provider_id)
);

create table if not exists public.sponsors_config (
  kind text primary key check (kind in ('llm','embedding','image','tts','stt','video','search','fetch','music')),
  enabled boolean not null default true,
  max_visible int not null default 3 check (max_visible between 0 and 20),
  updated_at timestamptz not null default now()
);

-- Seed per-kind config (idempotent)
insert into public.sponsors_config (kind, enabled, max_visible) values
  ('llm', true, 3),
  ('embedding', true, 3)
on conflict (kind) do nothing;

-- Example seed: AgentRouter sponsored slot in LLM (replace href as needed)
insert into public.sponsors (provider_id, kind, position, badge_label, badge_sublabel, href) values
  ('agentrouter', 'llm', 0, 'Offer', '30% Free', 'https://agentrouter.org/register?aff=s44z')
on conflict (kind, provider_id) do nothing;

alter table public.sponsors enable row level security;
alter table public.sponsors_config enable row level security;

-- Anon can read (any install fetches badge metadata — no secrets in rows)
drop policy if exists "anon read sponsors" on public.sponsors;
create policy "anon read sponsors" on public.sponsors for select using (true);

drop policy if exists "anon read sponsors_config" on public.sponsors_config;
create policy "anon read sponsors_config" on public.sponsors_config for select using (true);

-- No anon insert/update/delete policies => writes require service_role (Supabase Studio or server route)

create index if not exists sponsors_kind_pos_idx on public.sponsors(kind, position, provider_id);
