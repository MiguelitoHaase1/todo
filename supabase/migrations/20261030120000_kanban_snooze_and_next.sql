-- Kanban card buttons (hypotheses e63cae98 snooze, 3930fe40 next), 2026-10-30.
--
-- snoozed_until: the card greys out until this instant. The brew sets it to the
-- next 05:00 Europe/Copenhagen, and the browser compares it to now, so the
-- snooze wears off without a cron. Null = not snoozed.
--
-- is_next: the ONE card to act on now. It stays until Michael picks another,
-- clears it, or the task leaves 'open'. The partial unique index makes a second
-- marked card impossible, so a double tap or a race can't leave two.

alter table tasks
  add column if not exists snoozed_until timestamptz,
  add column if not exists is_next boolean not null default false;

create unique index if not exists tasks_one_next on tasks ((true)) where is_next;

-- One call moves the mark: clear first, then set, in one transaction. Passing
-- null just clears it. Marking a card next also lifts its snooze: a card can't
-- be both "do this now" and "pay less attention to this".
create or replace function set_next_task(p_id uuid) returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  update tasks set is_next = false where is_next and (p_id is null or id <> p_id);
  if p_id is not null then
    update tasks set is_next = true, snoozed_until = null where id = p_id;
  end if;
end;
$$;

grant execute on function set_next_task(uuid) to anon, authenticated;

-- A finished, dropped or archived task never holds the next slot.
create or replace function tasks_clear_next_on_close() returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.status <> 'open' then
    new.is_next := false;
  end if;
  return new;
end;
$$;

drop trigger if exists tasks_clear_next_on_close on tasks;
create trigger tasks_clear_next_on_close
  before update of status on tasks
  for each row execute function tasks_clear_next_on_close();

-- PostgREST caches the schema; without this the new columns and the RPC 404/400
-- until the cache refreshes on its own.
notify pgrst, 'reload schema';
