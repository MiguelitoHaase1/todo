-- Keep pg_cron's own run log from eating the database.
--
-- On 2026-09-04 this database was 159 MB, and 139 MB of it was
-- cron.job_run_details — 53,149 rows, nothing had ever read one. pg_cron
-- appends a row per run and never removes it, so a job on '* * * * *' writes
-- 1,440 rows a day at roughly 2.6 kB each (the row stores the full command
-- text and the return message). That is ~3.7 MB/day, forever.
--
-- Why it matters on a Micro instance and not just as clutter: shared_buffers
-- is 224 MB. A 139 MB write-only table competes for the cache with the tables
-- anyone actually reads, and pg_cron scans the whole thing on restart to mark
-- orphaned runs failed — measured at 19.4 s during that morning's restart,
-- while the board was down.
--
-- Seven days is the retention because the only thing that ever reads this
-- table is a human debugging a job that misfired, and that question is always
-- about the last day or two.

-- NOTE for anyone replaying this against a database that has already grown:
-- the DELETE alone frees nothing on disk, it only marks tuples dead. The
-- first run here dropped 43,117 rows and left the table at 139 MB. Space came
-- back only after `vacuum full cron.job_run_details`, which took the database
-- from 159 MB to 25 MB. That statement is deliberately NOT in this file —
-- VACUUM FULL cannot run inside a transaction block, so it would break the
-- migration. Run it by hand, once, after applying this.
delete from cron.job_run_details
where start_time < now() - interval '7 days';

-- Nightly, at 03:17 UTC — off the hour on purpose, so it does not land in the
-- same minute as every other scheduled job.
select cron.unschedule('purge-cron-history')
where exists (select 1 from cron.job where jobname = 'purge-cron-history');

select cron.schedule(
  'purge-cron-history',
  '17 3 * * *',
  $purge$
    delete from cron.job_run_details
    where start_time < now() - interval '7 days';
  $purge$
);
