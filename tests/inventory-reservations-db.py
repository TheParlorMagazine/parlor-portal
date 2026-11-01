"""Real disposable PostgreSQL: holds, atomic consumption and hostile RPC arguments."""
import concurrent.futures,json,pathlib,subprocess,time,uuid
root=pathlib.Path(__file__).resolve().parents[1];name='parlor-reservations-'+uuid.uuid4().hex[:8]
def command(args,**kwargs):
 r=subprocess.run(args,text=True,capture_output=True,**kwargs)
 if r.returncode:raise RuntimeError(r.stderr)
 return r.stdout.strip()
def sql(q):return command(['docker','exec','-i',name,'psql','-h','127.0.0.1','-U','postgres','-At','-v','ON_ERROR_STOP=1'],input=q)
def uid(n):return f'00000000-0000-0000-0000-{n:012d}'
def j(x):return "'"+json.dumps(x).replace("'","''")+"'::jsonb"
def rejects(q):
 try:sql(q)
 except RuntimeError:return
 raise AssertionError('Expected rejection: '+q[:100])
def reserve(n,qty=1,vid='7',treat=False,inv=None):
 inventory=inv if inv is not None else [{'product_id':uid(2),'quantity':qty,'variant_id':vid}]
 return json.loads(sql(f"select public.reserve_checkout('{uid(1)}','{uid(n)}','shop_order','finger-{n}','resource-{n}',{j(inventory)},"+(f"ARRAY['{uid(3)}'::uuid]" if treat else "ARRAY[]::uuid[]")+f",'{json.dumps({'mode':'payment','line_items':[{'price':'price_test','quantity':1}],'customer':'cus_test','client_reference_id':uid(1),'metadata':{'userId':uid(1)}})}'::jsonb,now()+interval '31 minutes');"))
def observe(r,state):return json.loads(sql(f"select public.observe_checkout('{r['id']}','cs_{r['request_id'][-4:]}','{state}');"))
def order(r,override=None,items=None):
 o={'member_id':uid(1),'payment_intent':'pi_'+r['id'],'subtotal_cents':100,'shipping_cents':0,'total_cents':100,'currency':'usd','metadata':{'reservation_id':r['id'],'packing_items':[{'product_id':i['product_id'],'printify_variant_id':i.get('variant_id'),'quantity':i['quantity']} for i in r['inventory']]},'inventory':r['inventory']}
 o.update(override or {})
 rows=items if items is not None else [{'product_name':'Tote','quantity':1,'unit_price_cents':100,'shop_product_id':uid(2)}]
 return sql(f"select public.record_paid_shop_order('cs_{r['request_id'][-4:]}',{j(o)},{j(rows)},"+(f"ARRAY['{uid(3)}'::uuid]" if r['treat_ids'] else "ARRAY[]::uuid[]")+");")
try:
 command(['docker','run','--name',name,'-e','POSTGRES_PASSWORD=local-only','-d','postgres:16'])
 for _ in range(100):
  try:sql('select 1');break
  except RuntimeError:time.sleep(.1)
 sql('create role anon;create role authenticated;create role service_role;create table members(id uuid primary key);create table articles(id uuid primary key);create table item_purchases(id uuid default gen_random_uuid(),member_id uuid,article_id uuid,item_type text);create table shop_products(id uuid primary key,inventory integer,variants jsonb);create table tot_treats(id uuid primary key,stock integer);create table email_automations(id text primary key,enabled boolean,sent_count integer);')
 for f in ['20260927_orders.sql','20260930_shop_printify.sql','20261021_stripe_email_tracking.sql','20261025_shop_payment_fulfillment.sql','20261026090000_inventory_reservations.sql']:sql((root/'supabase/migrations'/f).read_text())
 sql((root/'supabase/migrations/20261026090000_inventory_reservations.sql').read_text())
 sql(f"insert into members values('{uid(1)}');insert into shop_products values('{uid(2)}',3,'[{{\"printify_variant_id\":7,\"inventory\":3}},{{\"printify_variant_id\":8,\"inventory\":0}}]');insert into tot_treats values('{uid(3)}',2);")
 def attempt(n):
  try:return reserve(n)
  except RuntimeError:return None
 with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:rows=[r for r in pool.map(attempt,range(100,108)) if r]
 assert len(rows)==3
 assert sql('select inventory from shop_products')=='3' # Reservations never mutate on-hand.
 r=rows[0]
 try:order(r);raise AssertionError('unpaid reservation consumed')
 except RuntimeError:pass
 assert reserve(int(r['request_id'][-12:]))['id']==r['id']
 observe(r,'released');observe(r,'released');assert sql('select inventory from shop_products')=='3'
 replacement=reserve(200);assert replacement['id']!=r['id']
 paid=rows[1]
 alias=uid(9990)
 alias_row=json.loads(sql(f"select public.reserve_checkout('{uid(1)}','{alias}','shop_order','{paid['fingerprint']}','{paid['resource_key']}',{j(paid['inventory'])},ARRAY[]::uuid[],{j(paid['stripe_params'])},now()+interval '31 minutes')"))
 assert alias_row['id']==paid['id']
 observe(paid,'paid');sql(f"update checkout_reservations set expires_at=now()-interval '2 days' where id='{paid['id']}'")
 assert observe(paid,'released')['state']=='paid'
 with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:paid_orders=list(pool.map(lambda _:json.loads(order(paid)),range(6)))
 assert len({o['id'] for o in paid_orders})==1
 assert sql('select inventory from shop_products')=='2'
 assert observe(paid,'released')['state']=='consumed'
 order(paid);assert sql('select inventory from shop_products')=='2'
 assert json.loads(sql(f"select public.reserve_checkout('{uid(1)}','{alias}','shop_order','{paid['fingerprint']}','{paid['resource_key']}',{j(paid['inventory'])},ARRAY[]::uuid[],{j(paid['stripe_params'])},now()+interval '31 minutes')"))['state']=='consumed'
 # Changed variants after a paid order do not break replay of its saved allocation.
 sql("update shop_products set variants='[]'");order(paid)
 rejects(f"select public.observe_checkout('{paid['id']}','cs_other','paid')")
 try:order(paid,{'total_cents':999});raise AssertionError('conflicting total accepted')
 except RuntimeError:pass
 try:order(paid,items=[{'product_name':'Changed','quantity':1,'unit_price_cents':100}]);raise AssertionError('conflicting lines accepted')
 except RuntimeError:pass
 assert sql('select inventory from shop_products')=='2'
 # Release remaining holds, then exercise variant and treat constraints.
 for held in [rows[2],replacement]:observe(held,'released')
 sql("update shop_products set inventory=10,variants='[{\"printify_variant_id\":7,\"inventory\":1},{\"printify_variant_id\":8,\"inventory\":0}]'")
 for bad in [0,-1,1.5,None,'1']:
  try:reserve(300,inv=[{'product_id':uid(2),'quantity':bad,'variant_id':'7'}]);raise AssertionError('bad quantity accepted')
  except RuntimeError:pass
 for vid in ['8','99']:
  try:reserve(301,vid=vid);raise AssertionError('bad variant accepted')
  except RuntimeError:pass
 a=reserve(302,treat=True);observe(a,'paid');order(a)
 assert sql('select stock from tot_treats')=='1'
 assert sql("select variants->0->>'inventory' from shop_products")=='0'
 sql("update shop_products set variants='[]'")
 b=reserve(303,treat=True);observe(b,'released');observe(b,'released')
 assert sql('select stock from tot_treats')=='1'
 # An entitlement committed after an API's initial access check must still
 # block a fresh digital reservation in the same database serialization order.
 sql(f"insert into articles values('{uid(800)}');insert into item_purchases(member_id,article_id,item_type) values('{uid(1)}','{uid(800)}','article')")
 digital_params={'mode':'payment','customer':'cus','client_reference_id':uid(1),'metadata':{'userId':uid(1),'articleId':uid(800),'itemType':'article'},'line_items':[{'price':'price_article','quantity':1}]}
 rejects(f"select public.reserve_checkout('{uid(1)}','{uid(801)}','digital','digital-fingerprint','digital:{uid(800)}:article','[]',ARRAY[]::uuid[],{j(digital_params)},now()+interval '31 minutes')")
 # Invalid input must reject atomically, never create a header or increase stock.
 base={'member_id':uid(1),'subtotal_cents':100,'shipping_cents':0,'total_cents':100,'currency':'usd','inventory':[]}
 good=[{'product_name':'Valid','quantity':1,'unit_price_cents':100}]
 for session,o,items in [('',base,good),('cs_null',base,None),('cs_neg',base,[{'product_name':'Bad','quantity':-2,'unit_price_cents':100}]),('cs_money',{**base,'total_cents':-1},good),('cs_inv',{**base,'inventory':[{'product_id':uid(2),'quantity':-2}]},good),('cs_missing',{**base,'inventory':[{'product_id':uid(999),'quantity':1}]},good),('cs_str',{**base,'shipping_cents':'0'},good),('cs_omit',base,[{**good[0],'shop_product_id':uid(2)}])]:
  rejects(f"select public.record_paid_shop_order('{session}',{j(o)},"+('NULL' if items is None else j(items))+",ARRAY[]::uuid[])")
 # More malformed shapes must roll back before touching any stock.
 before_stock=sql('select inventory from shop_products;select stock from tot_treats;')
 for n,items in enumerate([{},[],None,[None],[{'product_name':'X','quantity':0,'unit_price_cents':1}],[{'product_name':'X','quantity':1.2,'unit_price_cents':1}],[{'product_name':'X','quantity':1,'unit_price_cents':-1}]]):
  rejects(f"select public.record_paid_shop_order('cs_shape{n}',{j(base)},"+('NULL' if items is None else j(items))+",ARRAY[]::uuid[])")
 for n,inventory in enumerate([None,{},[{'product_id':uid(2),'quantity':None}],[{'product_id':'not-uuid','quantity':1}]]):
  rejects(f"select public.record_paid_shop_order('cs_inventory{n}',{j({**base,'inventory':inventory})},{j(good)},ARRAY[]::uuid[])")
 rejects(f"select public.record_paid_shop_order('   ',{j(base)},{j(good)},ARRAY[]::uuid[])")
 try:order(paid,{'payment_intent':'pi_conflicting'});raise AssertionError('conflicting payment accepted')
 except RuntimeError:pass
 assert sql('select inventory from shop_products;select stock from tot_treats;')==before_stock
 assert sql("select count(*) from orders where stripe_session_id in ('','cs_null','cs_neg','cs_money','cs_inv','cs_missing','cs_str')")=='0'
 # Uncreated failures/duplicate releases never increment authoritative stock.
 c=reserve(304,inv=[]);sql(f"select public.reject_checkout_creation('{c['id']}');select public.reject_checkout_creation('{c['id']}');")
 d=reserve(305,inv=[]);sql(f"update checkout_reservations set expires_at=now()-interval '2 minutes' where id='{d['id']}';select public.release_uncreated_checkout('{d['id']}')")
 assert sql(f"select state from checkout_reservations where id='{d['id']}'")=='released'
 for role in ['anon','authenticated']:
  assert sql(f"select has_table_privilege('{role}','checkout_reservations','select')")=='f'
  assert sql(f"select has_function_privilege('{role}','reserve_checkout(uuid,uuid,text,text,text,jsonb,uuid[],jsonb,timestamptz)','execute')")=='f'
 for role in ['anon','authenticated']:
  for function in ['observe_checkout(uuid,text,text)','release_uncreated_checkout(uuid)','reject_checkout_creation(uuid)','consume_digital_checkout(uuid,text,uuid,uuid,text)','record_paid_shop_order(text,jsonb,jsonb,uuid[])']:
   assert sql(f"select has_function_privilege('{role}','{function}','execute')")=='f'
 assert sql('select count(*) from orders')=='2'
 print('PASS: eight concurrent reservations admit only available stock; replay consumes once; paid holds survive expiry/release; product/variant/treat stock, conflicts, malformed SQL, duplicate release and service-only permissions verified.')
finally:subprocess.run(['docker','rm','-f',name],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
