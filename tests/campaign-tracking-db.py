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
 sql('create role anon;create role authenticated;create role service_role;create table members(id uuid primary key,full_name text,email text,newsletter_subscribed boolean,unsubscribed_at timestamptz);create table email_campaigns(id uuid primary key,open_count integer default 0,click_count integer default 0);')
 migration=(root/'supabase/migrations/20261026140000_campaign_engagement_tracking.sql').read_text();sql(migration);sql(migration)
 sql(f"insert into members(id) values('{uid(1)}'),('{uid(2)}');insert into email_campaigns(id) values('{uid(10)}'),('{uid(11)}'),('{uid(12)}');update email_campaigns set engagement_tracking_enabled=true where id in('{uid(10)}','{uid(11)}');")
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
 sql(f"update members set full_name='Reader One',email='reader@example.test' where id='{uid(1)}';")
 def activity(f='all'):
  return json.loads(sql(f"select coalesce(json_agg(s),'[]'::json) from campaign_subscriber_activity('{uid(10)}',0,'{f}') s"))
 assert len(activity())==2 and len(activity('clicked'))==1 and activity('clicked')[0]['email']=='reader@example.test'
 assert activity('clicked')[0]['clicks']==3 and len(activity('clicked')[0]['links'])==2
 assert len(activity('unsubscribed'))==0
 assert sql(f"select unsubscribe_email_member('{uid(1)}','{uid(10)}');")=='t'
 assert len(activity('unsubscribed'))==1
 assert sql(f"select count(*) from email_subscription_events where member_id='{uid(1)}' and event_type='unsubscribed'")=='1'
 sql(f"select unsubscribe_email_member('{uid(1)}','{uid(10)}');")
 assert sql(f"select count(*) from email_subscription_events where member_id='{uid(1)}'")=='1'
 sql(f"update members set newsletter_subscribed=true,unsubscribed_at=null where id='{uid(1)}';")
 assert sql(f"select count(*) from email_subscription_events where member_id='{uid(1)}' and event_type='subscribed'")=='1'
 sql(f"update members set newsletter_subscribed=false,unsubscribed_at=now() where id='{uid(2)}';")
 assert sql(f"select source from email_subscription_events where member_id='{uid(2)}'")=='preferences'
 # The member update and its event roll back together.
 before=sql('select count(*) from email_subscription_events')
 sql(f"begin;update members set newsletter_subscribed=true,unsubscribed_at=null where id='{uid(2)}';rollback;")
 assert sql('select count(*) from email_subscription_events')==before
 assert len(activity('unsubscribed'))==1 # unrelated preference does not acquire campaign attribution
 assert sql("select has_function_privilege('authenticated','campaign_subscriber_activity(uuid,integer,text)','execute');select has_table_privilege('anon','email_subscription_events','select');select has_function_privilege('authenticated','unsubscribe_email_member(uuid,uuid)','execute');")=='f\nf\nf'
 sql(f"delete from members where id='{uid(1)}';")
 assert stats(10)['open_count']==1 and stats(10)['click_count']==1
 assert sql("select has_table_privilege('anon','campaign_email_events','select');select has_table_privilege('authenticated','campaign_email_deliveries','select');select has_function_privilege('anon','campaign_tracking_stats(uuid[])','execute');")=='f\nf\nf'
 sql(migration);assert stats(10)['total_click_count']==3
 sql(f"delete from email_campaigns where id='{uid(10)}';")
 assert sql(f"select count(*) from campaign_email_deliveries where campaign_id='{uid(10)}'")=='0'
 assert stats(11)['open_count']==1
 print('PASS: migration repeatable, unique and total engagement, early/out-of-order events, concurrent duplicate webhooks, campaign isolation, legacy state, deleted members and service-only access.')
finally:subprocess.run(['docker','rm','-f',name],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
