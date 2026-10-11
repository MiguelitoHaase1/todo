-- Morning snapshot: one precomputed row per Copenhagen weekday, written at
-- 06:30 local by the morning-prewarmer edge function, read by the morning
-- briefing in one query. Same access shape as daily_closeouts: the public
-- key may read, only the service role writes.

create table if not exists public.morning_snapshots (
  date       date primary key,
  payload    jsonb not null,
  created_at timestamptz not null default now()
);

alter table public.morning_snapshots enable row level security;

drop policy if exists "Read morning snapshots" on public.morning_snapshots;
create policy "Read morning snapshots" on public.morning_snapshots
  for select to anon, authenticated using (true);

-- Own shared secret, so either job's secret can be rotated alone.
do $$
begin
  if not exists (select 1 from vault.secrets where name = 'prewarmer_cron_secret') then
    perform vault.create_secret(encode(extensions.gen_random_bytes(32), 'hex'), 'prewarmer_cron_secret');
  end if;
end $$;

create or replace function public.prewarmer_secret_ok(candidate text)
returns boolean
language sql
security definer
set search_path = ''
as $$
  select exists (
    select 1 from vault.decrypted_secrets
    where name = 'prewarmer_cron_secret' and decrypted_secret = candidate
  );
$$;

revoke all on function public.prewarmer_secret_ok(text) from public, anon, authenticated;
grant execute on function public.prewarmer_secret_ok(text) to service_role;

-- 04:30 UTC is 06:30 in Copenhagen in summer, 05:30 UTC in winter. Both fire;
-- the function skips the run where Copenhagen is not at 06:xx.
select cron.unschedule('morning-flight-deck-630am')
where exists (select 1 from cron.job where jobname = 'morning-flight-deck-630am');

select cron.schedule(
  'morning-flight-deck-630am',
  '30 4,5 * * 1-5',
  $job$
    select net.http_post(
      url     := 'https://xwxsrsybllifbivhgojl.supabase.co/functions/v1/morning-prewarmer',
      headers := jsonb_build_object(
                   'Content-Type', 'application/json',
                   'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'closeout_function_key'),
                   'x-prewarmer-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'prewarmer_cron_secret')
                 ),
      body    := '{}'::jsonb
    );
  $job$
);
