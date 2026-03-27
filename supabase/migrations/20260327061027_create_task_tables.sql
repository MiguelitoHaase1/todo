-- Tasks table: core task storage
create table tasks (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  description text,
  priority    smallint not null default 3 check (priority between 0 and 4),
  status      text not null default 'open' check (status in ('open', 'done', 'archived')),
  due_date    date,
  todoist_id  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index idx_tasks_status on tasks(status);
create index idx_tasks_due_date on tasks(due_date);
create index idx_tasks_priority on tasks(priority);
create index idx_tasks_todoist_id on tasks(todoist_id);

-- Labels table: flexible grouping (projects, contexts, areas, etc.)
create table labels (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  label_type  text not null,
  color       text,
  unique(name, label_type)
);

create index idx_labels_type on labels(label_type);

-- Junction table: tasks <-> labels (many-to-many)
create table task_labels (
  task_id     uuid not null references tasks(id) on delete cascade,
  label_id    uuid not null references labels(id) on delete cascade,
  primary key (task_id, label_id)
);

create index idx_task_labels_label on task_labels(label_id);

-- Task links: relationships between tasks
create table task_links (
  source_id   uuid not null references tasks(id) on delete cascade,
  target_id   uuid not null references tasks(id) on delete cascade,
  link_type   text not null check (link_type in ('parent', 'child', 'related')),
  created_at  timestamptz not null default now(),
  primary key (source_id, target_id, link_type)
);

create index idx_task_links_target on task_links(target_id);

-- Auto-update updated_at on tasks
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger tasks_updated_at
  before update on tasks
  for each row execute function update_updated_at();

-- Enable RLS but allow all access (single user system)
alter table tasks enable row level security;
alter table labels enable row level security;
alter table task_labels enable row level security;
alter table task_links enable row level security;

create policy "Allow all access to tasks" on tasks for all using (true) with check (true);
create policy "Allow all access to labels" on labels for all using (true) with check (true);
create policy "Allow all access to task_labels" on task_labels for all using (true) with check (true);
create policy "Allow all access to task_links" on task_links for all using (true) with check (true);
