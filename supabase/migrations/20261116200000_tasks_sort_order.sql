-- Manual card order on the board (hypothesis 93a3635f), 2026-11-16.
--
-- Michael wants to drag a card up or down inside a day and have it stay there,
-- without changing its P level. sort_order is that position. Null means "never
-- placed by hand": the board slots it by priority, then created_at.
--
-- A double, not an int, so a drop between two cards can take the midpoint
-- without renumbering the whole day.

alter table tasks
  add column if not exists sort_order double precision;
