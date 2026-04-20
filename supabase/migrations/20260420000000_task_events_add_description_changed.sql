-- Extend the task_events.event_type check constraint to include
-- 'description_changed'. The new td_edit tool emits one audit row per
-- field changed, and description updates need their own event_type
-- so we can measure reshape friction independently of title edits.

alter table task_events drop constraint if exists task_events_event_type_check;

alter table task_events add constraint task_events_event_type_check
  check (event_type in (
    'created', 'status_changed', 'priority_changed',
    'deferred', 'due_date_set', 'title_changed',
    'description_changed'
  ));
