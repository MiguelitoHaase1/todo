-- Move the afternoon closeout from 15:30 to 15:00 Copenhagen.
--
-- Same UTC pair as before, half an hour earlier: 13:00 UTC is 15:00 local in
-- summer, 14:00 UTC is 15:00 in winter. The function's guard keeps only the
-- run where Copenhagen reads 15:xx, so it needs no change.
select cron.unschedule(jobname) from cron.job where jobname like 'afternoon-closeout%';

select cron.schedule(
  'afternoon-closeout-3pm',
  '0 13,14 * * 1-5',
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
