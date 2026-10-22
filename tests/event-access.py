"""Integration tests using a disposable local PostgreSQL 16 Docker container.
Run: python tests/event-access.py. No application credentials or network services used.
"""
import concurrent.futures, json, pathlib, subprocess, uuid
ROOT = pathlib.Path(__file__).resolve().parents[1]
NAME = 'parlor-events-' + uuid.uuid4().hex[:10]

def command(args, **kwargs):
    result = subprocess.run(args, text=True, capture_output=True, **kwargs)
    if result.returncode: raise subprocess.CalledProcessError(result.returncode,args,output=result.stdout,stderr=result.stderr)
    return result.stdout.strip()
def sql(query):
    return command(['docker','exec','-i',NAME,'psql','-h','127.0.0.1','-U','postgres','-At','-v','ON_ERROR_STOP=1'], input=query)
def uid(n): return f'00000000-0000-0000-0000-{n:012d}'
def register(member, action='join', target=None, event=101):
    return json.loads(sql(f"select event_registration('{uid(event)}','{uid(member)}','{action}'," + (f"'{uid(target)}'" if target else 'null') + ');'))
def summary(member,event=101): return json.loads(sql(f"select event_summary('{uid(event)}','{uid(member)}');"))
def denied(query):
    try: sql(query)
    except subprocess.CalledProcessError: return
    raise AssertionError('Expected database rejection: '+query)
try:
    command(['docker','run','--name',NAME,'-e','POSTGRES_PASSWORD=local-test-only','-d','postgres:16'])
    for _ in range(100):
        try: sql('select 1;'); break
        except subprocess.CalledProcessError: __import__('time').sleep(.1)
    sql((ROOT/'tests/event-access-schema.sql').read_text())
    migration=(ROOT/'supabase/migrations/20261022_event_access_waitlist.sql').read_text()
    sql(migration); sql(migration)  # Repeatable migration.
    for n in range(1,35):
        role = 'admin' if n==1 else 'social_admin' if n==3 else 'member'
        sql(f"insert into members values('{uid(n)}','{role}','Member {n}','member{n}@example.invalid');")
    sql(f"insert into forums values('{uid(100)}','active');insert into forum_members values('{uid(100)}','{uid(2)}','host'),('{uid(100)}','{uid(4)}','member');")
    sql(f"insert into events(id,title,forum_id,created_by,capacity,is_public,join_url) values('{uid(101)}','Public event','{uid(100)}','{uid(2)}',2,true,'https://example.invalid/meeting'),('{uid(102)}','Private event','{uid(100)}','{uid(2)}',5,false,'https://example.invalid/private');")
    assert summary(1)['my_status']=='host' and summary(2)['my_status']=='host' and summary(3)['my_status']=='host'
    assert register(1)['status']=='host'
    assert summary(5)['event']['join_url'] is None
    denied(f"select event_summary('{uid(102)}','{uid(5)}');")
    denied(f"select event_registration('{uid(102)}','{uid(5)}','join');")
    assert summary(4,102)['event']['title']=='Private event'
    register(4);register(5);register(6);register(7)
    assert summary(6)['queue_position']==1 and summary(7)['queue_position']==2
    assert sql(f"select count(*) from forum_members where member_id='{uid(5)}';")=='0'
    register(4,'cancel')
    assert summary(6)['my_status']=='going' and summary(7)['queue_position']==1
    assert sql(f"select role from forum_members where member_id='{uid(4)}';")=='member'
    register(2,'cancel')
    assert sql(f"select role from forum_members where member_id='{uid(2)}';")=='host'
    assert summary(2)['event']['going_count']==2
    denied(f"select event_registration('{uid(101)}','{uid(7)}','remove','{uid(5)}');")
    denied(f"select event_registration('{uid(101)}','{uid(2)}','promote','{uid(7)}');")
    register(7,'cancel');register(8);register(7)
    assert summary(8)['queue_position']==1 and summary(7)['queue_position']==2
    sql(f"update events set capacity=3 where id='{uid(101)}';")
    register(2,'promote',7)
    assert summary(7)['my_status']=='going' and summary(8)['my_status']=='waitlist'
    sql(f"update events set capacity=4 where id='{uid(101)}';")
    register(2,'reconcile')
    assert summary(8)['my_status']=='going'
    denied(f"update events set capacity=1 where id='{uid(101)}';")
    # Twenty simultaneous registrations compete for three remaining places.
    sql(f"update events set capacity=7 where id='{uid(101)}';")
    with concurrent.futures.ThreadPoolExecutor(max_workers=20) as pool:
        list(pool.map(register,range(10,30)))
    assert summary(2)['event']['going_count']==7
    assert sql(f"select count(*) from event_attendance where event_id='{uid(101)}' and status='waitlist';")=='17'
    # Multiple retries do not duplicate registrations or messages.
    before=sql('select count(*) from event_registration_messages;')
    register(10);register(10)
    assert sql('select count(*) from event_registration_messages;')==before
    assert sql(f"select count(*) from event_registration_messages where kind='promoted' and member_id='{uid(6)}';")=='1'
    sql('select queue_event_audience_reminders();')
    denied(f"set role authenticated;select event_registration('{uid(101)}','{uid(5)}','join');")
    denied(f"set role authenticated;update event_rsvps set status='going';")
    print('PASS: visibility, staff exclusion, private access, FIFO promotion, manual management, membership preservation, queue re-entry, concurrency, idempotence, migration repeatability, RPC permissions')
except subprocess.CalledProcessError as error:
    print(error.stderr)
    raise
finally:
    subprocess.run(['docker','rm','-f',NAME],capture_output=True)
