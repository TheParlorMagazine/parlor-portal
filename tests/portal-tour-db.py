"""Validate the optional tour migration in a disposable local PostgreSQL container."""
import pathlib, subprocess, time, uuid
ROOT=pathlib.Path(__file__).resolve().parents[1]
NAME='parlor-tour-'+uuid.uuid4().hex[:10]
def sql(query):
 result=subprocess.run(['docker','exec','-i',NAME,'psql','-h','127.0.0.1','-U','postgres','-At','-v','ON_ERROR_STOP=1'],input=query,text=True,capture_output=True)
 if result.returncode: raise RuntimeError(result.stderr)
 return result.stdout.strip()
def denied(query):
 try: sql(query)
 except RuntimeError: return
 raise AssertionError('Expected denial: '+query)
try:
 subprocess.run(['docker','run','--name',NAME,'-e','POSTGRES_PASSWORD=local-test-only','-d','postgres:16'],check=True,capture_output=True)
 for _ in range(100):
  try: sql('select 1;');break
  except RuntimeError: time.sleep(.1)
 sql('create role anon;create role authenticated;create role service_role bypassrls;create table public.members(id uuid primary key);')
 migration=(ROOT/'supabase/migrations/20261022_member_portal_tour.sql').read_text()
 sql(migration);launch=sql('select launched_at from portal_tour_config;');sql(migration)
 assert sql('select launched_at from portal_tour_config;')==launch
 first='00000000-0000-0000-0000-000000000001';second='00000000-0000-0000-0000-000000000002'
 sql(f"insert into members values('{first}'),('{second}');")
 sql(f"set role service_role;insert into member_portal_tour_state(member_id,status,step) values('{first}','completed',4),('{second}','postponed',1);")
 assert sql(f"select status from member_portal_tour_state where member_id='{second}';")=='postponed'
 denied("set role authenticated;select * from member_portal_tour_state;")
 denied(f"set role authenticated;update member_portal_tour_state set status='completed' where member_id='{second}';")
 denied(f"update member_portal_tour_state set step=5 where member_id='{first}';")
 denied(f"update member_portal_tour_state set status='paid' where member_id='{first}';")
 sql(f"delete from members where id='{first}';")
 assert sql('select count(*) from member_portal_tour_state;')=='1'
 print('PASS: repeatable migration and stable launch cutoff; independent per-member status; schema constraints; restricted browser access; cascading deletion.')
finally:
 subprocess.run(['docker','rm','-f',NAME],capture_output=True)
