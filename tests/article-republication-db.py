"""Republication schema rehearsal; disposable PostgreSQL, never production."""
import pathlib,subprocess,time,uuid
name='parlor-republication-'+uuid.uuid4().hex[:8]
def cmd(args,**kwargs):
 r=subprocess.run(args,text=True,capture_output=True,**kwargs)
 if r.returncode:raise RuntimeError(r.stderr)
 return r.stdout.strip()
def sql(q):return cmd(['docker','exec','-i',name,'psql','-h','127.0.0.1','-U','postgres','-At','-v','ON_ERROR_STOP=1'],input=q)
def reject(q):
 try:sql(q)
 except RuntimeError:return
 raise AssertionError('Expected rejection')
def fixture():
 sql("drop schema public cascade;create schema public;create table articles(id int primary key,author_id uuid,author_name text,published boolean,scheduled_at timestamptz);grant select on articles to anon;insert into articles values(1,'00000000-0000-0000-0000-000000000001','Existing Writer',true,null)")
def columns():return sql("select count(*) from information_schema.columns where table_schema='public' and table_name='articles'")
try:
 cmd(['docker','run','--name',name,'-e','POSTGRES_PASSWORD=local-test-only','-d','postgres:16'])
 for _ in range(100):
  try:sql('select 1');break
  except RuntimeError:time.sleep(.1)
 sql('create role anon')
 migration=pathlib.Path('supabase/migrations/20261028100000_republication_attribution.sql').read_text()
 fixture();sql(migration);sql(migration)
 assert sql("select author_name||':'||is_republished from articles where id=1")=='Existing Writer:false'
 assert sql("select has_table_privilege('anon','articles','select')")=='t'
 sql("insert into articles(id,is_republished,published) values(2,true,false)")
 reject('update articles set published=true where id=2')
 reject("update articles set scheduled_at=now()+interval '1 day' where id=2")
 sql("update articles set author_name='Original Author',original_publication_name='Original Publication',original_publication_date='2025-01-01',published=true where id=2")
 reject("update articles set author_id='00000000-0000-0000-0000-000000000001' where id=2")
 reject("update articles set original_publication_name=' ' where id=2")
 sql("update articles set is_republished=false,author_id='00000000-0000-0000-0000-000000000001',author_name='Parlor Writer' where id=2")
 assert sql('select count(*) from articles')=='2'
 # Existing incompatible column definitions abort, including all earlier DDL.
 for ddl in ["add column is_republished text", "add column is_republished boolean not null default true", "add column original_publication_date text", "add column original_publication_name text not null default ''", "add column original_article_url text default 'https://wrong.example'"]:
  fixture();sql('alter table articles '+ddl);before=columns();reject(migration);assert columns()==before
 # Same-name constraints are verified, not silently dropped or trusted.
 fixture();sql('alter table articles add constraint articles_republished_author_check check(author_id is not null)');before=columns();reject(migration);assert columns()==before
 assert sql("select count(*) from pg_constraint where conrelid='articles'::regclass and conname='articles_republished_author_check'")=='1'
 # Compatible metadata/defaults survive. Simulate the earlier proposal applied.
 fixture();sql("alter table articles add column is_republished boolean not null default false,add column original_publication_name text,add column original_article_url text;alter table articles add constraint articles_republished_author_check check(not is_republished or author_id is null),add constraint articles_republished_credit_check check(not is_republished or published is not true or (nullif(btrim(author_name),'') is not null and nullif(btrim(original_publication_name),'') is not null));insert into articles(id,author_name,published,is_republished,original_publication_name,original_article_url) values(2,'Original Author',true,true,'Source','https://source.example/original')")
 sql(migration);sql(migration)
 assert sql("select author_name||':'||original_article_url from articles where id=2")=='Original Author:https://source.example/original'
 assert sql("select count(*) from pg_constraint where conrelid='articles'::regclass and conname='articles_republished_credit_check'")=='0'
 assert sql("select count(*) from pg_constraint where conrelid='articles'::regclass and conname='articles_republished_author_check'")=='1'
 # Never silently rewrite pre-existing associations or incomplete scheduled data.
 fixture();sql("alter table articles add column is_republished boolean not null default false,add column original_publication_name text;update articles set is_republished=true,original_publication_name='Source' where id=1");before=columns();reject(migration);assert columns()==before;assert sql('select author_id is not null from articles where id=1')=='t'
 fixture();sql("alter table articles add column is_republished boolean not null default false;insert into articles(id,is_republished,scheduled_at) values(2,true,now())");before=columns();reject(migration);assert columns()==before
 print('PASS: repeatability; original authors/grants unchanged; incomplete drafts; publish/schedule validation; NULL writer association; compatible old proposal repair; existing metadata preserved; incompatible types/defaults/nullability and conflicting constraints roll back atomically; no guessed backfill or unlinking.')
finally:subprocess.run(['docker','rm','-f',name],capture_output=True)
