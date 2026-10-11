-- Evening recaps from the Lovable "recap" skill: success, gratitude,
-- learning, and the key goal for the next day. morning-prewarmer reads the
-- goal into the morning snapshot's anchor_goal.
--
-- Append-only. The recap skill runs inside Lovable chat and saves with the
-- publishable key, so the public key may read and insert, never update or
-- delete. A redone recap is a new row; readers take the newest one. Length
-- caps keep a leaked key from turning this into free storage.

create table if not exists public.daily_recaps (
  id          uuid primary key default gen_random_uuid(),
  recap_date  date not null,
  next_date   date not null check (next_date > recap_date),
  success     text check (length(success)   <= 2000),
  gratitude   text check (length(gratitude) <= 2000),
  learning    text check (length(learning)  <= 2000),
  next_goal   text check (length(next_goal) <= 2000),
  created_at  timestamptz not null default now()
);

create index if not exists daily_recaps_next_date_idx
  on public.daily_recaps (next_date desc, created_at desc);

alter table public.daily_recaps enable row level security;

drop policy if exists "Read recaps" on public.daily_recaps;
create policy "Read recaps" on public.daily_recaps
  for select to anon, authenticated using (true);

drop policy if exists "Add recaps" on public.daily_recaps;
create policy "Add recaps" on public.daily_recaps
  for insert to anon, authenticated with check (true);

-- No update or delete policy, and no grant either, so both are refused even
-- if a policy is added by mistake later.
revoke update, delete, truncate on public.daily_recaps from anon, authenticated;
