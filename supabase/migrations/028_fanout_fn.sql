create or replace function public.notify_fanout(
  p_channel text,
  p_table_name text,
  p_row_id text,
  p_payload jsonb
)
returns void
language plpgsql
security definer
as $$
declare
  v_worker_url text;
  v_fanout_secret text;
begin
  -- Insert into outbox first for durability and audit
  insert into public.realtime_outbox (table_name, row_id, channel, payload)
  values (p_table_name, p_row_id, p_channel, p_payload);

  -- Fetch worker settings
  v_worker_url := current_setting('app.settings.realtime_worker_url', true);
  v_fanout_secret := coalesce(current_setting('app.settings.fanout_secret', true), 'dev-secret');

  -- Dispatched via pg_net if configured
  if v_worker_url is not null and v_worker_url != '' then
    begin
      perform net.http_post(
        url := v_worker_url || '/fanout',
        body := jsonb_build_object(
          'channel', p_channel,
          'payload', p_payload
        ),
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'x-fanout-secret', v_fanout_secret
        )
      );
    exception when others then
      -- Swallow network errors so main transaction never fails
      null;
    end;
  end if;
end;
$$;
