-- Shared email-send budget. No raw email addresses or IPs are stored.
create table if not exists public.auth_email_request_limits (
  key text primary key,
  started_at timestamptz not null,
  requests integer not null
);
alter table public.auth_email_request_limits enable row level security;
revoke all on public.auth_email_request_limits from anon, authenticated;
create or replace function public.claim_auth_email_request(email_key text, ip_key text default null)
returns integer language plpgsql security definer set search_path = public as $$
declare
  k text;
  n integer;
  start_time timestamptz;
  retry integer := 0;
  budget integer;
begin
  -- Stable lock ordering prevents deadlocks between concurrent email/IP claims.
  for k in select distinct v from unnest(array[email_key, ip_key]) as t(v) where v is not null order by v loop
    budget := case when k = email_key then 3 else 20 end;
    insert into auth_email_request_limits(key, started_at, requests) values(k, clock_timestamp(), 0)
      on conflict (key) do nothing;
    select started_at, requests into start_time, n from auth_email_request_limits where key = k for update;
    if start_time <= clock_timestamp() - interval '15 minutes' then
      start_time := clock_timestamp(); n := 0;
    end if;
    if n >= budget then
      retry := greatest(retry, greatest(1, ceil(extract(epoch from start_time + interval '15 minutes' - clock_timestamp()))::integer));
    end if;
    update auth_email_request_limits set started_at = start_time, requests = least(n + 1, budget) where key = k;
  end loop;
  delete from auth_email_request_limits where started_at < clock_timestamp() - interval '1 day';
  return retry;
end;
$$;
revoke all on function public.claim_auth_email_request(text,text) from public, anon, authenticated;
grant execute on function public.claim_auth_email_request(text,text) to service_role;
