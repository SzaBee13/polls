create extension if not exists pg_cron;
grant usage on schema cron to postgres;

select
  cron.schedule(
    'daily-poll-selector',
    '0 0 * * *', -- UTC Midnight
    $$
    select
      net.http_post(
        url:='https://izcfkwvregyollaxltbt.supabase.co/functions/v1/select-daily-poll',
        headers:='{
          "Content-Type": "application/json", 
          "Authorization": "Bearer SUPABASE_ANON_KEY"
          "apikey": "SUPABASE_ANON_KEY"
        }'::jsonb,
        body:='{"action": "selectDaily"}'::jsonb
      )
    $$
  );