"""External author arrays; isolated PostgreSQL only, no production access."""
import pathlib,subprocess,time,uuid,json
name='parlor-author-bios-'+uuid.uuid4().hex[:8]
def cmd(a,**kw):
 r=subprocess.run(a,text=True,capture_output=True,**kw)
 if r.returncode:raise RuntimeError(r.stderr)
 return r.stdout.strip()
def sql(q):return cmd(['docker','exec','-i',name,'psql','-h','127.0.0.1','-U','postgres','-At','-v','ON_ERROR_STOP=1'],input=q)
def reject(q):
 try:sql(q)
 except RuntimeError:return
 raise AssertionError('Expected rejection')
def quote(v):return "'"+v.replace("'","''")+"'"
def set_authors(a):return sql('update articles set republication_authors='+quote(json.dumps(a))+'::jsonb where id=2')
base=pathlib.Path('supabase/migrations/20261028100000_republication_attribution.sql').read_text()
migration=pathlib.Path('supabase/migrations/20261028110000_republication_authors.sql').read_text()
def fixture():
 sql("drop schema public cascade;create schema public;create table articles(id int primary key,author_id uuid,author_name text,author_bio text,published boolean,scheduled_at timestamptz);grant select on articles to anon;insert into articles values(1,'00000000-0000-0000-0000-000000000001','Parlor Writer','Parlor bio',true,null)")
 sql(base)
 sql("insert into articles(id,author_name,author_bio,is_republished,original_publication_name,published) values(2,'Legacy Author','Legacy bio',true,'Original Source',true)")
try:
 cmd(['docker','run','--name',name,'-e','POSTGRES_PASSWORD=local-test-only','-d','postgres:16'])
 for _ in range(100):
  try:sql('select 1');break
  except RuntimeError:time.sleep(.1)
 sql('create role anon');fixture();sql(migration);sql(migration)
 assert sql("select author_name||':'||author_bio||':'||republication_authors::text from articles where id=2")=='Legacy Author:Legacy bio:[]'
 assert sql("select author_id is not null from articles where id=1")=='t'
 assert sql("select has_table_privilege('anon','articles','select')")=='t'
 authors=[{'name':'Jane','bio':'Jane bio'},{'name':'Alex','bio':'Alex bio','photo_url':'https://photo.example/alex.jpg'}]
 set_authors(authors);assert json.loads(sql('select republication_authors from articles where id=2'))==authors
 for invalid in [{},None,1,'text',[None],[1],[{}],[{'name':None}],[{'name':'Jane','bio':3}],[{'name':'Jane','photo_url':False}],[{'name':'Jane','profile_url':[]}],[{'name':'   '}],[{'name':'Jane'},{'name':'\t\n'}]]:
  reject('update articles set republication_authors='+quote(json.dumps(invalid))+'::jsonb where id=2')
 sql('update articles set published=false where id=2');set_authors([{'name':'Jane'},{'name':'','bio':'Unfinished draft'}])
 reject('update articles set published=true where id=2');reject("update articles set scheduled_at=now()+interval '1 day' where id=2")
 set_authors(authors);sql("update articles set scheduled_at=now()+interval '1 day' where id=2")
 sql('update articles set published=true where id=2')
 reject("update articles set author_id='00000000-0000-0000-0000-000000000001' where id=2")
 # Incompatible prior definitions and same-name constraints abort without rewrites.
 fixture();sql('alter table articles add column republication_authors text');reject(migration);assert sql("select data_type from information_schema.columns where table_schema='public' and table_name='articles' and column_name='republication_authors'")=='text'
 fixture();sql("alter table articles add column republication_authors jsonb default '[]'::jsonb");reject(migration)
 fixture();sql("alter table articles add column republication_authors jsonb not null default '{}'::jsonb");reject(migration)
 fixture();sql('alter table articles add constraint articles_republication_authors_shape_check check(id>0)');reject(migration);assert sql("select count(*) from information_schema.columns where table_schema='public' and table_name='articles' and column_name='republication_authors'")=='0'
 print('PASS: additive/repeatable author arrays preserve legacy rows, names, bios, relationships and grants; malformed JSON rejected; incomplete drafts allowed; publish/schedule validation; NULL external author_id retained; incompatible existing definitions/constraints roll back.')
finally:subprocess.run(['docker','rm','-f',name],capture_output=True)
