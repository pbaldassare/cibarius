
SELECT cron.schedule(
  'daily-expiry-alerts',
  '0 8 * * *',
  $$
  SELECT net.http_post(
    url := 'https://dqhzopbjhxyhgcpedskl.supabase.co/functions/v1/send-expiry-alerts',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRxaHpvcGJqaHh5aGdjcGVkc2tsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE5NDMwNjMsImV4cCI6MjA4NzUxOTA2M30.mkryGdAt1EdgsgXo753ric4cUEjhO1NRK7bfKEyhclU"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $$
);
