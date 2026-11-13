"""Validate the churn trigger against disposable local PostgreSQL only."""
import pathlib,subprocess,time,uuid
name='parlor-paid-history-'+uuid.uuid4().hex[:8]
def cmd(args,**kw):
 r=subprocess.run(['docker','--host=unix:///var/run/docker.sock',*args],text=True,capture_output=True,**kw)
 if r.returncode:raise RuntimeError(r.stderr)
 return r.stdout.strip()
def sql(q):return cmd(['exec','-i',name,'psql','-U','postgres','-At','-v','ON_ERROR_STOP=1'],input=q)
def uid(n):return f'00000000-0000-0000-0000-{n:012d}'
try:
 cmd(['run','--name',name,'-e','POSTGRES_PASSWORD=local-test-only','-d','postgres:16'])
 for _ in range(80):
  try:sql('select 1');break
  except RuntimeError:time.sleep(.25)
 sql("create role anon;create role authenticated;create role service_role;create table members(id uuid primary key,plan text,subscription_status text,joined_at timestamptz default now(),newsletter_subscribed boolean default true);")
 sql(f"insert into members(id,plan,subscription_status) values('{uid(1)}','Reader''s Circle','active'),('{uid(2)}','Printing Press','cancelled');")
 migration=(pathlib.Path(__file__).resolve().parents[1]/'supabase/migrations/20261113180000_paid_plan_history.sql').read_text()
 sql(migration)
 assert sql("select count(*) from member_paid_plan_history where ended_at is not null")=='1'
 sql(f"update members set plan=null where id='{uid(1)}';")
 assert sql(f"select subscription_status||':'||newsletter_subscribed from members where id='{uid(1)}'")=='churned:true'
 assert sql(f"select plan_key from member_paid_plan_history where member_id='{uid(1)}' and ended_at is not null")=='circle'
 sql(f"update members set plan='Reader''s Circle',subscription_status='active' where id='{uid(1)}';")
 assert sql(f"select count(*) from member_paid_plan_history where member_id='{uid(1)}' and ended_at is null")=='1'
 sql(f"update members set newsletter_subscribed=false where id='{uid(1)}';")
 assert sql(f"select count(*) from member_paid_plan_history where member_id='{uid(1)}' and ended_at is null")=='1'
 sql(f"update members set plan='Printing Press' where id='{uid(1)}';")
 assert sql(f"select plan_key from member_paid_plan_history where member_id='{uid(1)}' and ended_at is not null")=='circle'
 sql(f"insert into members(id,plan,subscription_status) values('{uid(3)}','Reader''s Circle','active');")
 assert sql(f"select count(*) from member_paid_plan_history where member_id='{uid(3)}'")=='1'
 sql(migration)
 assert sql("select count(*) from member_paid_plan_history")=='4'
 try:sql('set role authenticated;select * from member_paid_plan_history;')
 except RuntimeError:pass
 else:raise AssertionError('History exposed to non-service roles')
 print('PASS: migration/backfill/reapply, cancellation captures former plan atomically, newsletter opt-out preserves paid membership, reactivation and plan changes, private history permissions.')
finally:cmd(['rm','-f',name])
