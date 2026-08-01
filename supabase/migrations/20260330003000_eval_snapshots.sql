-- Daily eval score snapshots
-- One row per eval per day, persisted by the plan-tomorrow flow
create table eval_snapshots (
  id          uuid primary key default gen_random_uuid(),
  eval_id     text not null,
  date        date not null,
  score       numeric(4,3),
  components  jsonb,
  created_at  timestamptz not null default now(),
  unique(eval_id, date)
);

create index idx_eval_snapshots_eval on eval_snapshots(eval_id);
create index idx_eval_snapshots_date on eval_snapshots(date);

-- RLS: same open policy
alter table eval_snapshots enable row level security;
create policy "Allow all access to eval_snapshots" on eval_snapshots
  for all using (true) with check (true);
