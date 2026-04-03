-- Deduplication: track platform message ID to prevent duplicate task creation
-- when multiple Claude Code sessions process the same Discord/iMessage message.
--
-- Partial unique index (nulls excluded) lets most tasks omit the column freely
-- while enforcing uniqueness for platform-sourced tasks that set it.
alter table tasks add column source_message_id text;

create unique index idx_tasks_source_message_id
  on tasks(source_message_id)
  where source_message_id is not null;
