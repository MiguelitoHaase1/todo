-- Audit log for task state changes
-- Captures every mutation so we can measure deferrals, completion speed, priority changes
create table task_events (
  id              uuid primary key default gen_random_uuid(),
  task_id         uuid not null references tasks(id) on delete cascade,
  event_type      text not null check (event_type in (
    'created', 'status_changed', 'priority_changed',
    'deferred', 'due_date_set', 'title_changed'
  )),
  previous_value  text,
  new_value       text,
  source          text not null check (source in (
    'cli', 'imessage', 'morning', 'triage', 'plan_tomorrow'
  )),
  created_at      timestamptz not null default now()
);

create index idx_task_events_task on task_events(task_id);
create index idx_task_events_type on task_events(event_type);
create index idx_task_events_date on task_events(created_at);

-- RLS: same open policy as tasks (single user system)
alter table task_events enable row level security;
create policy "Allow all access to task_events" on task_events
  for all using (true) with check (true);
