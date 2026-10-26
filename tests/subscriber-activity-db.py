"""Subscriber activity against disposable PostgreSQL only; never a hosted database."""
import concurrent.futures,json,pathlib,subprocess,time,uuid
root=pathlib.Path(__file__).resolve().parents[1];name='parlor-activity-'+uuid.uuid4().hex[:10]
def cmd(args,**kw):
 r=subprocess.run(args,text=True,capture_output=True,**kw)
 if r.returncode:raise RuntimeError(r.stderr)
 return r.stdout.strip()
def sql(q):return cmd(['docker','exec','-i',name,'psql','-h','127.0.0.1','-U','postgres','-At','-v','ON_ERROR_STOP=1'],input=q)
def uid(n):return f'00000000-0000-0000-0000-{n:012d}'
def activity(n=1):return json.loads(sql(f"select subscriber_activity_30_days('{uid(n)}')"))
try:
 cmd(['docker','run','--name',name,'-e','POSTGRES_PASSWORD=local-test-only','-d','postgres:16'])
 for _ in range(100):
  try:sql('select 1');break
  except RuntimeError:time.sleep(.1)
 sql('''create role anon;create role authenticated;create role service_role;
 create table members(id uuid primary key,full_name text,email text,newsletter_subscribed boolean,unsubscribed_at timestamptz,plan text,subscription_status text,bio text,notes text);
 create table email_campaigns(id uuid primary key,name text,subject text);
 create table orders(id uuid primary key,member_id uuid,placed_at timestamptz,order_number text,total_cents int,currency text,status text);
 create table articles(id uuid primary key,title text);
 create table item_purchases(id uuid primary key,member_id uuid,article_id uuid,item_type text,purchased_at timestamptz);
 ''')
 sql((root/'supabase/migrations/20261026140000_campaign_engagement_tracking.sql').read_text())
 migration=(root/'supabase/migrations/20261026160000_subscriber_activity.sql').read_text();sql(migration);sql(migration)
 sql(f"insert into members(id,full_name) values('{uid(1)}','Reader One'),('{uid(2)}','Other'),('{uid(3)}','Rate test');")
 sql(f"select record_subscriber_site_event('{uid(1)}','{uid(10)}','page_view','/shop',null);")
 with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:list(pool.map(lambda _:sql(f"select record_subscriber_site_event('{uid(1)}','{uid(11)}','click','/shop','action:checkout');"),range(6)))
 sql(f"insert into subscriber_site_events values('{uid(12)}','{uid(1)}','page_view','/too-old',null,now()-interval '31 days'),('{uid(13)}','{uid(1)}','page_view','/future',null,now()+interval '1 day'),('{uid(14)}','{uid(2)}','page_view','/other-user',null,now());")
 assert activity()['counts']['page_views']==1 and activity()['counts']['site_clicks']==1
 assert activity()['top_pages'][0]['path']=='/shop'
 sql(f"insert into email_campaigns(id,name,subject) values('{uid(20)}','Newsletter','Recent stories');insert into campaign_email_deliveries values('message','{uid(20)}','{uid(1)}',now());insert into campaign_email_events(event_id,provider_email_id,event_type,occurred_at,link) values('open','message','email.opened',now(),null),('click','message','email.clicked',now(),'https://example.test/story');")
 sql(f"insert into orders values('{uid(30)}','{uid(1)}',now(),'PARLOR-1',5000,'usd','processing');insert into articles values('{uid(31)}','Article One');insert into item_purchases values('{uid(32)}','{uid(1)}','{uid(31)}','article',now());")
 sql(f"update members set bio='DO NOT RETAIN THIS PERSONAL TEXT',plan='Reader Circle' where id='{uid(1)}';")
 assert sql(f"select count(*) from subscriber_account_changes where member_id='{uid(1)}'")=='2'
 assert 'DO NOT RETAIN' not in sql('select row_to_json(s) from subscriber_account_changes s')
 sql(f"update members set notes='Admin internal note' where id='{uid(1)}';")
 assert sql(f"select count(*) from subscriber_account_changes where member_id='{uid(1)}'")=='2'
 sql(f"select unsubscribe_email_member('{uid(1)}','{uid(20)}');")
 a=activity();assert a['counts']['orders']==1 and a['counts']['article_purchases']==1 and a['counts']['email_opens']==1 and a['counts']['email_clicks']==1 and a['counts']['account_changes']==3
 assert all(e['member_id']==uid(1) for e in a['events'])
 assert len(activity(2)['events'])==1
 before=sql('select count(*) from subscriber_account_changes');sql(f"begin;update members set email='private@example.test' where id='{uid(1)}';rollback;");assert sql('select count(*) from subscriber_account_changes')==before
 # Concurrent requests cannot exceed the per-account limit.
 sql(f"insert into subscriber_site_events(id,member_id,event_type,path) select md5(i::text)::uuid,'{uid(3)}','page_view','/shop' from generate_series(1,119) i;")
 with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:list(pool.map(lambda _:sql(f"select record_subscriber_site_event('{uid(3)}','{uuid.uuid4()}','page_view','/shop',null);"),range(8)))
 assert sql(f"select count(*) from subscriber_site_events where member_id='{uid(3)}'")=='120'
 assert sql("select has_table_privilege('anon','subscriber_site_events','select');select has_table_privilege('authenticated','subscriber_account_changes','insert');select has_function_privilege('authenticated','record_subscriber_site_event(uuid,uuid,text,text,text)','execute');select has_function_privilege('anon','subscriber_activity_30_days(uuid,integer)','execute');select has_table_privilege('authenticated','subscriber_activity_feed','select');")=='f\nf\nf\nf\nf'
 sql('select prune_subscriber_activity();');assert sql("select count(*) from subscriber_site_events where path='/too-old'")=='0';assert sql('select count(*) from orders')=='1'
 sql('alter table item_purchases rename column purchased_at to created_at;');assert activity()['counts']['article_purchases']==1
 sql(migration);assert activity()['counts']['site_clicks']==1
 sql(f"delete from members where id='{uid(2)}';");assert sql(f"select count(*) from subscriber_site_events where member_id='{uid(2)}'")=='0'
 print('PASS: repeatable migrations; 30-day boundaries; member isolation; email/purchase/preference rollup; field-only audit and rollback; duplicate/concurrent events; rate limiting; private grants; pruning; legacy purchase timestamps.')
finally:subprocess.run(['docker','rm','-f',name],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
