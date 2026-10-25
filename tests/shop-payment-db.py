"""Disposable PostgreSQL integration: atomic paid-order retries and stock."""
import concurrent.futures,json,pathlib,subprocess,time,uuid
root=pathlib.Path(__file__).resolve().parents[1];name='parlor-shop-'+uuid.uuid4().hex[:10]
def command(args,**kwargs):
 r=subprocess.run(args,text=True,capture_output=True,**kwargs)
 if r.returncode: raise RuntimeError(r.stderr)
 return r.stdout.strip()
def sql(q):return command(['docker','exec','-i',name,'psql','-h','127.0.0.1','-U','postgres','-At','-v','ON_ERROR_STOP=1'],input=q)
def uid(n):return f'00000000-0000-0000-0000-{n:012d}'
def record(session='cs_paid',items=None):
 o={'member_id':uid(1),'email':'buyer@example.invalid','subtotal_cents':2000,'shipping_cents':500,'total_cents':2500,'currency':'usd','inventory':[{'product_id':uid(2),'quantity':2,'variant_id':'7'}]}
 rows=items if items is not None else [{'product_name':'Tote','quantity':2,'unit_price_cents':1000,'shop_product_id':uid(2)}]
 return sql("select public.record_paid_shop_order('"+session+"','"+json.dumps(o)+"'::jsonb,'"+json.dumps(rows)+"'::jsonb,ARRAY['"+uid(3)+"'::uuid]);")
try:
 command(['docker','run','--name',name,'-e','POSTGRES_PASSWORD=local-test-only','-d','postgres:16'])
 for _ in range(100):
  try:sql('select 1;');break
  except RuntimeError:time.sleep(.1)
 sql('create role anon;create role authenticated;create role service_role;create table members(id uuid primary key);create table shop_products(id uuid primary key, inventory integer,variants jsonb);create table tot_treats(id uuid primary key,stock integer);create table email_automations(id text primary key,enabled boolean,sent_count integer);')
 for f in ['20260927_orders.sql','20260930_shop_printify.sql','20261021_stripe_email_tracking.sql']:sql((root/'supabase/migrations'/f).read_text())
 migration=(root/'supabase/migrations/20261025_shop_payment_fulfillment.sql').read_text()
 sql('alter table email_automations rename column sent_count to missing_count;')
 try:sql(migration);raise AssertionError('Expected prerequisite rejection')
 except RuntimeError as error:assert 'Missing prerequisite column' in str(error)
 assert sql("select count(*) from information_schema.columns where table_schema='public' and table_name='orders' and column_name='metadata'")=='0'
 sql('alter table email_automations rename column missing_count to sent_count;alter table orders add column metadata text;')
 try:sql(migration);raise AssertionError('Expected custom-schema rejection')
 except RuntimeError as error:assert 'custom type' in str(error)
 assert sql("select count(*) from pg_proc where proname='record_paid_shop_order'")=='0'
 sql('alter table orders drop column metadata;')
 sql(migration);sql(migration)
 sql(f"insert into members values('{uid(1)}');insert into shop_products values('{uid(2)}',10,'[{{\"printify_variant_id\":7,\"inventory\":8}}]');insert into tot_treats values('{uid(3)}',5);")
 with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:results=list(pool.map(lambda _:json.loads(record()),range(6)))
 assert len({r['id'] for r in results})==1
 assert sql('select count(*) from orders;select count(*) from order_items;')=='1\n1'
 assert sql(f"select inventory from shop_products where id='{uid(2)}';select variants->0->>'inventory' from shop_products;select stock from tot_treats;")=='8\n6\n4'
 try:record('cs_bad',[{'product_name':'Bad','quantity':None}]);raise AssertionError('Expected rollback')
 except RuntimeError:pass
 assert sql("select count(*) from orders where stripe_session_id='cs_bad'")=='0'
 assert sql('select inventory from shop_products;select stock from tot_treats;')=='8\n4'
 sql("delete from order_items;");record();assert sql('select count(*) from order_items;select inventory from shop_products;')=='1\n8'
 sql('update shop_products set inventory=0;');short=json.loads(record('cs_short'));assert short['metadata']['stock_review_required']
 assert sql('select inventory from shop_products;')=='0'
 assert sql("select public.claim_stripe_email('cs_paid','shop_order_confirmation','buyer@example.invalid')")=='t'
 assert sql("select public.claim_stripe_email('cs_paid','shop_order_confirmation','buyer@example.invalid')")=='f'
 sql("update stripe_email_deliveries set status='failed';")
 assert sql("select public.claim_stripe_email('cs_paid','shop_order_confirmation','buyer@example.invalid')")=='t'
 sql("update stripe_email_deliveries set status='uncertain';")
 assert sql("select public.claim_stripe_email('cs_paid','shop_order_confirmation','buyer@example.invalid')")=='f'
 assert sql("select has_table_privilege('anon','public.orders','select')")=='f'
 assert sql("select has_function_privilege('anon','public.record_paid_shop_order(text,jsonb,jsonb,uuid[])','execute')")=='f'
 sql(migration)
 assert sql("select status from stripe_email_deliveries")=='uncertain'
 assert sql('select count(*) from orders')=='2'
 print('PASS: prerequisite failures leave no partial changes; custom schema rejected; PostgreSQL migration repeatable, six concurrent deliveries create one order, single stock decrement, variant stock, rollback, partial-order repair, shortages, safe receipt retry and service-only access.')
finally:
 subprocess.run(['docker','rm','-f',name],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
