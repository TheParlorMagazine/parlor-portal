"""Real disposable PostgreSQL: ticket schema, concurrent capacity, paid orders, RLS and fulfillment."""
import concurrent.futures,json,pathlib,subprocess,time,uuid
root=pathlib.Path(__file__).resolve().parents[1];name='parlor-film-tickets-'+uuid.uuid4().hex[:8]
def command(args,**kwargs):
 r=subprocess.run(args,text=True,capture_output=True,**kwargs)
 if r.returncode:raise RuntimeError(r.stderr or r.stdout)
 return r.stdout.strip()
def sql(q):return command(['docker','exec','-i',name,'psql','-h','127.0.0.1','-U','postgres','-At','-v','ON_ERROR_STOP=1'],input=q)
def uid(n):return f'00000000-0000-0000-0000-{n:012d}'
def j(x):return "'"+json.dumps(x).replace("'","''")+"'::jsonb"
def reject(q):
 try:sql(q)
 except RuntimeError:return
 raise AssertionError('Expected rejection '+q[:80])
try:
 command(['docker','run','--name',name,'-e','POSTGRES_PASSWORD=local-only','-d','postgres:16'])
 for _ in range(100):
  try:sql('select 1');break
  except RuntimeError:time.sleep(.1)
 sql((root/'tests/event-access-schema.sql').read_text())
 sql("alter table members add column plan text,add column subscription_status text;alter table events add column is_public boolean default true,add column description text,add column cover_image_url text;alter table forums add column name text,add column description text,add column tied_to_type text,add column tied_to_ref text,add column created_by uuid,add column member_count integer,add column join_policy text;create table articles(id uuid primary key);create table item_purchases(member_id uuid,article_id uuid,item_type text);create table tot_treats(id uuid primary key,stock integer);create table email_automations(id text primary key,enabled boolean,sent_count integer);")
 for file in ['20260927_orders.sql','20260930_shop_products.sql','20260930_shop_printify.sql','20261021_stripe_email_tracking.sql','20261025_shop_payment_fulfillment.sql','20261026090000_inventory_reservations.sql','20261121110000_film_club_screenings.sql','20261125180000_film_club_member_tickets.sql']:
  sql((root/'supabase/migrations'/file).read_text())
 for n in range(1,12):sql(f"insert into members(id,plan,subscription_status) values('{uid(n)}','Reader Circle','active');")
 sql(f"insert into events(id,title,status,starts_at,is_public) values('{uid(100)}','Documentary','published',now()+interval '1 day',true);insert into film_club_screenings(event_id,sales_deadline,viewing_start,viewing_end,member_ticket_limit,provider_authorized,stripe_price_id,stripe_product_id,stripe_synced_version,sales_enabled) values('{uid(100)}',now()+interval '12 hours',now()+interval '1 day',now()+interval '2 days',2,true,'price_member','prod_member',1,true);")
 def reserve(n):
  params={'mode':'payment','currency':'usd','line_items':[{'price':'price_member','quantity':1}],'client_reference_id':uid(n),'metadata':{'userId':uid(n),'screening_id':uid(100),'amount_cents':'799','product_name':'Member ticket','price_id':'price_member','eligible_plan':'Reader Circle','eligible_status':'active'}}
  return json.loads(sql(f"select reserve_checkout('{uid(n)}','{uid(200+n)}','film_screening_ticket','finger-{n}','film:{uid(100)}','[]','{{}}',{j(params)},now()+interval '31 minutes')"))
 def attempt(n):
  try:return reserve(n)
  except RuntimeError:return None
 with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:rows=[r for r in pool.map(attempt,range(1,9)) if r]
 assert len(rows)==2,rows
 r=rows[0];mid=r['member_id']
 assert reserve(int(mid[-12:]))['id']==r['id']
 reject(f"select record_paid_film_ticket('{r['id']}','cs_test','pi_test',799,'usd','reader@example.invalid')")
 sql(f"select observe_checkout('{r['id']}','cs_test','paid')")
 reject(f"select record_paid_film_ticket('{r['id']}','cs_test','pi_test',1,'usd','reader@example.invalid')")
 ticket=json.loads(sql(f"select record_paid_film_ticket('{r['id']}','cs_test','pi_test',799,'usd','reader@example.invalid')"))
 assert ticket['payment_status']=='paid' and ticket['fulfillment_status']=='awaiting_access'
 assert json.loads(sql(f"select record_paid_film_ticket('{r['id']}','cs_test','pi_test',799,'usd','reader@example.invalid')"))['id']==ticket['id']
 assert sql('select count(*) from orders')=='1' and sql('select count(*) from order_items')=='1'
 sql(f"update members set subscription_status='expired' where id='{mid}';")
 assert sql(f"select payment_status from film_club_tickets where id='{ticket['id']}'")=='paid'
 sql(f"select update_film_ticket('{ticket['id']}',null,{j({'fulfillment_status':'access_assigned','viewing_url':'https://provider.invalid/private'})},'fulfillment')")
 sql(f"select update_film_ticket('{ticket['id']}',null,{j({'payment_status':'refunded','refunded_cents':799})},'payment')")
 assert sql(f"select fulfillment_status from film_club_tickets where id='{ticket['id']}'")=='cancelled'
 reject(f"select update_film_ticket('{ticket['id']}',null,{j({'fulfillment_status':'access_assigned'})},'fulfillment')")
 reject('set role anon;select * from film_club_tickets')
 reject('set role authenticated;select * from film_club_ticket_audit')
 reject(f"set role authenticated;select record_paid_film_ticket('{r['id']}','cs_test','pi_test',799,'usd','x')")
 reject(f"insert into event_rsvps(event_id,member_id,status) values('{uid(100)}','{uid(9)}','going')")
 sql(f"insert into events(id,title) values('{uid(101)}','Ordinary event');insert into event_rsvps(event_id,member_id,status) values('{uid(101)}','{uid(9)}','going')")
 # Unknown provider outcomes keep holds even when old; actual Stripe reconciliation is required.
 held=rows[1];sql(f"update checkout_reservations set expires_at=now()-interval '1 day' where id='{held['id']}'")
 assert attempt(10) is None
 sql(f"select observe_checkout('{held['id']}','cs_expired','released')")
 assert attempt(10) is not None
 print('PASS migration + concurrent capacity + idempotent paid orders + retained tickets + RLS + refund cancellation + ordinary RSVP preservation')
finally:
 subprocess.run(['docker','rm','-f',name],capture_output=True)
