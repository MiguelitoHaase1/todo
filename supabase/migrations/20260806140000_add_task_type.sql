-- Add task_type to tasks (hypothesis 8aa4d287).
-- Drives the card icons in the kanban brew: a bolt for 'flash' (Michael's
-- definition: under 20 minutes), an hourglass for 'deep'.
--
-- Nullable on purpose. 'flash' and 'deep' do not cover admin, errands, or
-- anything else, and the renderer shows NO icon for null rather than guessing
-- one — a wrong badge is worse than an absent badge, because it teaches him to
-- stop trusting the badge everywhere. Every existing row stays null.
--
-- Set at WRITE time by whoever knows the work (td add --type, the /todo skill,
-- the agent-authored todos). Never inferred at render time.
ALTER TABLE tasks
  ADD COLUMN task_type text
    CHECK (task_type IS NULL OR task_type IN ('flash', 'deep'));
