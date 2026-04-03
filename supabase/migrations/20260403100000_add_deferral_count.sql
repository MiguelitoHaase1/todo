-- Add deferral_count to tasks.
-- Incremented each time a task is deferred in the morning flow.
-- Used by smart deferral escalation: at count >= 2, surface "drop or promote?".
ALTER TABLE tasks
  ADD COLUMN deferral_count int NOT NULL DEFAULT 0
    CHECK (deferral_count >= 0);
