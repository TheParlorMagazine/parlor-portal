"""Campaign engagement aggregation against disposable PostgreSQL only."""
import concurrent.futures,json,pathlib,subprocess,time,uuid
root=pathlib.Path(__file__).resolve().parents[1];name='parlor-tracking-'+uuid.uuid4().hex[:10]
def cmd(args,**kw):
 r=subprocess.run(args,text=True,capture_output=True,**kw)
 if r.returncode:raise RuntimeError(r.stderr)
 return r.stdout.strip()
def sql(q):return cmd(['docker','exec','-i',name,'psql','-h','127.0.0.1','-U','postgres','-At','-v','ON_ERROR_STOP=1'],input=q)
def uid(n):return f'00000000-0000-0000-0000-{n:012d}'
def event(e,email,kind,link=None):return sql("insert into campaign_email_events(event_id,provider_email_id,event_type,occurred_at,link) values('"+e+"','"+email+"','"+kind+"',now(),"+("'"+link+"'" if link else 'null')+") on conflict(event_id) do nothing;")
def stats(n):return json.loads(sql(f"select row_to_json(s) from campaign_tracking_stats(ARRAY['{uid(n)}'::uuid]) s"))
try:
 cmd(['docker','run','--name',name,'-e','POSTGRES_PASSWORD=local-test-only','-d','postgres:16'])
 for _ in range(100):
  try:sql('select 1');break
  except RuntimeError:time.sleep(.1)
 sql('create role anon;create role authenticated;create role service_role;create table members(id uuid primary key);create table email_campaigns(id uuid primary key,open_count integer default 0,click_count integer default 0);')
 migration=(root/'supabase/migrations/20261025190000_campaign_engagement_tracking.sql').read_text();sql(migration);sql(migration)
 sql(f"insert into members values('{uid(1)}'),('{uid(2)}');insert into email_campaigns(id) values('{uid(10)}'),('{uid(11)}'),('{uid(12)}');update email_campaigns set engagement_tracking_enabled=true where id in('{uid(10)}','{uid(11)}');")
 event('early-open','email-one','email.opened');event('early-open','email-one','email.opened')
 assert stats(10)['accepted_count']==0
 sql(f"insert into campaign_email_deliveries values('email-one','{uid(10)}','{uid(1)}',now()),('email-two','{uid(10)}','{uid(2)}',now()),('email-other','{uid(11)}','{uid(1)}',now());")
 event('repeat-open','email-one','email.opened');event('delivered','email-one','email.delivered');event('click-one','email-one','email.clicked','https://example.invalid/post/story');event('click-two','email-one','email.clicked','https://example.invalid/post/story');event('bounced','email-two','email.bounced');event('other-open','email-other','email.opened')
 s=stats(10);assert s['accepted_count']==2 and s['delivered_count']==1 and s['open_count']==1 and s['click_count']==1 and s['total_open_count']==2 and s['total_click_count']==2 and s['bounced_count']==1
 assert s['links'][0]['unique_clicks']==1 and s['links'][0]['total_clicks']==2
 assert stats(11)['total_open_count']==1
 with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:list(pool.map(lambda _:event('same-retry','email-one','email.clicked','https://example.invalid/shop'),range(6)))
 assert stats(10)['total_click_count']==3 and stats(10)['click_count']==1
 assert not stats(12)['tracked'] and stats(12)['accepted_count']==0
 sql(f"delete from members where id='{uid(1)}';")
 assert stats(10)['open_count']==1 and stats(10)['click_count']==1
 assert sql("select has_table_privilege('anon','campaign_email_events','select');select has_table_privilege('authenticated','campaign_email_deliveries','select');select has_function_privilege('anon','campaign_tracking_stats(uuid[])','execute');")=='f\nf\nf'
 sql(migration);assert stats(10)['total_click_count']==3
 sql(f"delete from email_campaigns where id='{uid(10)}';")
 assert sql(f"select count(*) from campaign_email_deliveries where campaign_id='{uid(10)}'")=='0'
 assert stats(11)['open_count']==1
 print('PASS: migration repeatable, unique and total engagement, early/out-of-order events, concurrent duplicate webhooks, campaign isolation, legacy state, deleted members and service-only access.')
finally:subprocess.run(['docker','rm','-f',name],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
