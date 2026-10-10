-- Afternoon closeout: one row per Copenhagen weekday, written at 15:30 local
-- by the closeout-aggregator edge function, read by Lovable OS.
--
-- Read access is anon SELECT on purpose. Lovable OS talks to this project with
-- the publishable key and no sign-in, the same way it reads `tasks` (whose
-- policy is already "all access, using true"). An authenticated-only policy
-- here would hide the closeout from the one app meant to show it, and would
-- protect nothing that `tasks` does not already expose. Writes stay
-- service-role only: there is no insert/update/delete policy.

create table if not exists public.daily_closeouts (
  id                uuid primary key default gen_random_uuid(),
  date              date not null unique,
  completed_tasks   jsonb not null default '[]'::jsonb,
  pending_tasks     jsonb not null default '[]'::jsonb,
  unprocessed_calls jsonb not null default '[]'::jsonb,
  summary           text,
  created_at        timestamptz not null default now()
);

alter table public.daily_closeouts enable row level security;

drop policy if exists "Read closeouts" on public.daily_closeouts;
create policy "Read closeouts" on public.daily_closeouts
  for select to anon, authenticated using (true);

-- Shared secret between pg_cron and the function. The publishable key in the
-- Authorization header gets past the gateway's JWT check, but anyone holding
-- that key could do the same, so the function also demands this header value.
-- Generated in the database and never printed.
do $$
begin
  if not exists (select 1 from vault.secrets where name = 'closeout_cron_secret') then
    perform vault.create_secret(encode(extensions.gen_random_bytes(32), 'hex'), 'closeout_cron_secret');
  end if;
  if not exists (select 1 from vault.secrets where name = 'closeout_function_key') then
    perform vault.create_secret(
      (select decrypted_secret from vault.decrypted_secrets where name = 'hemingway_function_key'),
      'closeout_function_key',
      'Publishable key the closeout cron sends as Bearer to pass verify_jwt'
    );
  end if;
end $$;

create or replace function public.closeout_secret_ok(candidate text)
returns boolean
language sql
security definer
set search_path = ''
as $$
  select exists (
    select 1 from vault.decrypted_secrets
    where name = 'closeout_cron_secret' and decrypted_secret = candidate
  );
$$;

revoke all on function public.closeout_secret_ok(text) from public, anon, authenticated;
grant execute on function public.closeout_secret_ok(text) to service_role;

-- pg_cron 1.6.4 has no timezone argument and runs in UTC. 13:30 UTC is 15:30
-- in Copenhagen in summer, 14:30 UTC is 15:30 in winter. Both fire; the
-- function skips the run where Copenhagen is not at 15:xx.
select cron.unschedule('afternoon-closeout-330pm')
where exists (select 1 from cron.job where jobname = 'afternoon-closeout-330pm');

select cron.schedule(
  'afternoon-closeout-330pm',
  '30 13,14 * * 1-5',
  $job$
    select net.http_post(
      url     := 'https://xwxsrsybllifbivhgojl.supabase.co/functions/v1/closeout-aggregator',
      headers := jsonb_build_object(
                   'Content-Type', 'application/json',
                   'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'closeout_function_key'),
                   'x-closeout-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'closeout_cron_secret')
                 ),
      body    := '{}'::jsonb
    );
  $job$
);
