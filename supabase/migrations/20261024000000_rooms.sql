-- Body Double rooms on Vercel. One row per village, holding the whole game as JSON.
-- Rows are wiped of every answer, profile and name when a tale ends, and deleted after 2 hours idle
-- (the app sweeps on every new village). Only the server's service-role key can touch this table.
create table if not exists public.rooms (
  code text primary key,
  version integer not null default 0,
  state jsonb not null,
  updated_at timestamptz not null default now()
);

create index if not exists rooms_updated_at_idx on public.rooms (updated_at);

-- RLS on with no policies: the anon/public key can't read or write rooms at all.
alter table public.rooms enable row level security;
