-- Provenance + review state on tasks (hypothesis 518bd6ee).
--
-- Since 2026-08-04 agents write unambiguous todos straight to Michael's list
-- rather than proposing them, because a proposal turns a finished task into a
-- pending one. That rule is only safe if there is one place where what got
-- written is visible and reversible in a single gesture. The review modal is
-- that place, and it cannot exist without knowing who wrote each row.
--
-- review_state is deliberately separate from status. A task can be pending
-- review and open at the same time; dropping it sets status='dropped' (an
-- existing value, added 20260330001000) and never deletes, so a wrong Drop
-- costs one query to undo.
ALTER TABLE tasks
  ADD COLUMN created_by text NOT NULL DEFAULT 'michael'
    CHECK (created_by IN ('michael', 'agent', 'todoist')),
  ADD COLUMN review_state text
    CHECK (review_state IS NULL OR review_state IN ('pending', 'accepted', 'dismissed'));

-- Every existing row predates the acceptance rule, so none of them is waiting
-- on a decision. NULL review_state means "nothing to review" and keeps the
-- modal empty until an agent actually writes something.
COMMENT ON COLUMN tasks.created_by IS
  'Who wrote this row. Agents set ''agent'' so the review modal can find their writes.';
COMMENT ON COLUMN tasks.review_state IS
  'NULL = nothing to review. pending = waiting in the review modal. accepted/dismissed = decided.';

-- The modal queries exactly this: pending rows, oldest first.
CREATE INDEX IF NOT EXISTS tasks_review_pending_idx
  ON tasks (review_state, due_date)
  WHERE review_state = 'pending';
