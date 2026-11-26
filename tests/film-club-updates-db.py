"""Film Club contact/reminder migrations on disposable PostgreSQL only."""
import concurrent.futures, json, pathlib, subprocess, uuid
ROOT = pathlib.Path(__file__).resolve().parents[1]
NAME = 'parlor-film-review-' + uuid.uuid4().hex[:8]
def command(args, **kwargs):
 r = subprocess.run(args, text=True, capture_output=True, **kwargs)
 if r.returncode: raise RuntimeError(r.stderr or r.stdout)
 return r.stdout.strip()
def sql(q): return command(['docker','exec','-i',NAME,'psql','-U','postgres','-At','-v','ON_ERROR_STOP=1'],input=q)
def uid(n): return f'00000000-0000-0000-0000-{n:012d}'
def denied(q):
 try: sql(q)
 except RuntimeError: return
 raise AssertionError('Expected rejection: '+q)
try:
 command(['docker','run','--name',NAME,'-e','POSTGRES_PASSWORD=local-test-only','-d','postgres:16'])
 for _ in range(100):
  try: sql('select 1');break
  except RuntimeError: __import__('time').sleep(.1)
 sql((ROOT/'tests/event-access-schema.sql').read_text())
 sql((ROOT/'supabase/migrations/20261022_event_access_waitlist.sql').read_text())
 sql("alter table members add column plan text, add column subscription_status text; alter table forums add column join_policy text default 'open', add column commenting_open boolean default true; create table film_club_screenings(event_id uuid primary key references events(id),forum_id uuid references forums(id),discussion_archived boolean default false,commenting_open boolean default true);")
 for suffix in ['20261121110400_film_club_emails.sql','20261121110500_film_club_screening_reminders.sql','20261121110600_film_club_rsvp_contact.sql']:
  sql((ROOT/'supabase/migrations'/suffix).read_text())
 for n,plan,status in [(1,'Free','active'),(2,"Reader Circle",'active'),(3,'Free','active'),(4,'Printing Press','expired'),(5,'Printing Press','active')]:
  sql(f"insert into members(id,role,email,plan,subscription_status) values('{uid(n)}','{'admin' if n==1 else 'member'}','member{n}@example.invalid','{plan}','{status}');")
 sql(f"insert into forums(id,status) values('{uid(100)}','active');insert into events(id,title,created_by,capacity,is_public,forum_id,starts_at,ends_at) values('{uid(101)}','Screening','{uid(1)}',1,true,'{uid(100)}',now()+interval '2 hours',now()+interval '4 hours'); insert into film_club_screenings(event_id,forum_id,discussion_email_enabled) values('{uid(101)}','{uid(100)}',true);")
 def register(n,name='Reader',email='Alternate@Example.invalid'):
  return json.loads(sql(f"select register_film_club_rsvp('{uid(101)}','{uid(n)}','{name}','{email}');"))
 denied(f"select register_film_club_rsvp('{uid(101)}','{uid(3)}','Free reader','free@example.invalid');")
 denied(f"select register_film_club_rsvp('{uid(101)}','{uid(4)}','Expired','expired@example.invalid');")
 denied(f"select register_film_club_rsvp('{uid(101)}','{uid(2)}','','bad');")
 assert register(2)['status']=='going'
 assert register(5,email='waitlisted@example.invalid')['status']=='waitlist'
 assert sql(f"select film_club_rsvp_email from event_rsvps where event_id='{uid(101)}' and member_id='{uid(2)}';")=='alternate@example.invalid'
 assert sql(f"select film_club_paid_at_rsvp from event_rsvps where member_id='{uid(2)}';")=='t'
 sql(f"insert into film_club_ticket_buyers values('{uid(101)}','alternate@example.invalid'),('{uid(101)}','buyer@example.invalid');")
 # Concurrent claims must deduplicate buyer/RSVP overlap and exclude waitlists/staff.
 with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
  results=list(pool.map(lambda _:sql('select email from claim_film_club_reminder_emails();'),range(2)))
 claimed=[email for result in results for email in result.splitlines() if email]
 assert sorted(claimed)==['alternate@example.invalid','buyer@example.invalid'],claimed
 sql('update film_club_reminder_deliveries set sent_at=now();')
 assert sql('select count(*) from claim_film_club_reminder_emails();')=='0'
 # The post-screening invitation uses the submitted contact and does not repeat.
 sql(f"update events set starts_at=now()-interval '4 hours',ends_at=now()-interval '2 hours' where id='{uid(101)}';")
 assert sql('select email from claim_film_club_discussion_emails();')=='alternate@example.invalid'
 assert sql('select count(*) from claim_film_club_discussion_emails();')=='0'
 # New claim audience includes Parlor purchases and newly registered free contacts.
 sql("create table film_club_tickets(event_id uuid,member_id uuid,payment_status text);")
 sql((ROOT/'supabase/migrations/20261126190000_film_club_screening_subscribers.sql').read_text())
 sql(f"insert into film_club_tickets values('{uid(101)}','{uid(3)}','paid'),('{uid(101)}','{uid(4)}','refunded'),('{uid(101)}','{uid(5)}','partially_refunded');insert into film_club_ticket_buyers values('{uid(101)}','member3@example.invalid');")
 # A purchaser in the imported contacts and paid-ticket audiences receives one invite.
 with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
  results=list(pool.map(lambda _:sql('select email from claim_film_club_discussion_emails();'),range(2)))
 assert sorted(email for result in results for email in result.splitlines() if email)==['member3@example.invalid','member5@example.invalid'],results
 sql('update film_club_discussion_deliveries set sent_at=now();')
 assert sql('select count(*) from claim_film_club_discussion_emails();')=='0'
 denied('set role authenticated; select * from claim_film_club_discussion_emails();')
 # Contact details and service-only RPCs are unavailable to browser database roles.
 for role in ['anon','authenticated']:
  denied(f"set role {role}; select register_film_club_rsvp('{uid(101)}','{uid(2)}','Reader','x@example.invalid');")
  denied(f'set role {role}; select * from film_club_reminder_deliveries;')
 print('PASS Film Club migrations: paid eligibility, contact persistence, capacity/waitlist, concurrent reminder deduplication, discussion contacts and role restrictions.')
finally:
 subprocess.run(['docker','rm','-f',NAME],capture_output=True)
