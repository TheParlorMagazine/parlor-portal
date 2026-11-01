"""Live presence integration against disposable PostgreSQL, never production."""
import concurrent.futures,json,pathlib,subprocess,time,uuid
root=pathlib.Path(__file__).resolve().parents[1];name='parlor-presence-'+uuid.uuid4().hex[:10]
def cmd(args,**kw):
 r=subprocess.run(args,text=True,capture_output=True,**kw)
 if r.returncode:raise RuntimeError(r.stderr)
 return r.stdout.strip()
def sql(q):return cmd(['docker','exec','-i',name,'psql','-h','127.0.0.1','-U','postgres','-At','-v','ON_ERROR_STOP=1'],input=q)
def uid(n):return f'00000000-0000-0000-0000-{n:012d}'
def touch(n=10,member=None,page='/shop'):
 m="'"+member+"'" if member else 'null'
 return sql(f"select touch_live_site_session('{uid(n)}',{m},'{page}','United States','Virginia','Dumfries','desktop')")
try:
 cmd(['docker','run','--name',name,'-e','POSTGRES_PASSWORD=local-test-only','-d','postgres:16'])
 for _ in range(100):
  try:sql('select 1');break
  except RuntimeError:time.sleep(.1)
 sql('create role anon;create role authenticated;create role service_role;create table members(id uuid primary key);create table active_sessions(visitor_id uuid primary key,current_page text);grant select,insert,update on active_sessions to anon;')
 sql(f"insert into active_sessions values('{uid(99)}','/legacy');insert into members values('{uid(1)}');")
 migration=(root/'supabase/migrations/20261026180000_live_sessions.sql').read_text();sql(migration);sql(migration)
 assert touch()=='t';assert touch()=='t';assert sql('select count(*) from live_site_sessions')=='1'
 with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:list(pool.map(lambda _:touch(),range(6)))
 assert sql('select count(*) from live_site_sessions')=='1'
 assert sql('select jsonb_array_length(recent_pages) from live_site_sessions')=='1'
 touch(member=uid(1),page='/post/member-story')
 row=json.loads(sql('select row_to_json(s) from live_site_sessions s'));assert row['member_id']==uid(1) and len(row['recent_pages'])==1 and row['recent_pages'][0]['path']=='/post/member-story'
 for i in range(25):touch(member=uid(1),page='/post/story-'+str(i))
 row=json.loads(sql('select row_to_json(s) from live_site_sessions s'));assert len(row['recent_pages'])==20 and row['current_page']=='/post/story-24'
 touch(member=None,page='/shop');row=json.loads(sql('select row_to_json(s) from live_site_sessions s'));assert row['member_id'] is None and len(row['recent_pages'])==1
 sql(f"insert into live_site_sessions(visitor_id,current_page,last_seen) values('{uid(11)}','/stale',now()-interval '2 minutes'),('{uid(12)}','/expired',now()-interval '11 minutes');")
 assert sql("select count(*) from live_site_sessions where last_seen>now()-interval '90 seconds'")=='1'
 sql('select prune_live_site_sessions()');assert sql("select count(*) from live_site_sessions where current_page='/expired'")=='0'
 assert sql("select count(*) from active_sessions where current_page='/legacy'")=='1'
 assert sql("select has_table_privilege('anon','live_site_sessions','select');select has_table_privilege('authenticated','live_site_sessions','insert');select has_function_privilege('anon','touch_live_site_session(uuid,uuid,text,text,text,text,text)','execute');select has_function_privilege('authenticated','prune_live_site_sessions()','execute');")=='f\nf\nf\nf'
 # Global admission cap remains atomic under simultaneous anonymous arrivals.
 sql("delete from live_site_sessions;insert into live_site_sessions(visitor_id,current_page) select md5(i::text)::uuid,'/shop' from generate_series(1,4999) i;")
 with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:results=list(pool.map(lambda i:touch(100+i),range(8)))
 assert results.count('t')==1 and sql('select count(*) from live_site_sessions')=='5000'
 sql(migration);assert sql('select count(*) from live_site_sessions')=='5000'
 print('PASS: repeatable private presence schema; anonymous/member/logout identity transitions; idempotent/concurrent heartbeats; bounded page history; 90-second freshness; stale cleanup; atomic session cap; legacy table preserved; no public reads or writes.')
finally:subprocess.run(['docker','rm','-f',name],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
