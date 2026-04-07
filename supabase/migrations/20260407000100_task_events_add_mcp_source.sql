-- Extend the task_events.source check constraint to include the values that
-- the TypeScript TaskEvent.source union has accumulated since the original
-- migration: 'discord' (channel capture), 'pwa' (web app), and 'mcp' (the
-- new remote MCP server). The DB constraint had drifted behind the type.
--
-- Postgres requires dropping and re-adding the check constraint to change it.

alter table task_events drop constraint if exists task_events_source_check;

alter table task_events add constraint task_events_source_check
  check (source in (
    'cli', 'imessage', 'discord', 'pwa', 'morning', 'triage', 'plan_tomorrow', 'mcp'
  ));
