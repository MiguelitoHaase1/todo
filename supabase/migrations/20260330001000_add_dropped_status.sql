-- Add 'dropped' as a valid task status
-- Previously only: open, done, archived
-- 'dropped' = user chose not to do this (distinct from 'done' = completed)
alter table tasks drop constraint tasks_status_check;
alter table tasks add constraint tasks_status_check
  check (status in ('open', 'done', 'dropped', 'archived'));
