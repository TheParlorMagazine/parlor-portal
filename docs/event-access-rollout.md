# Event access and waitlist rollout

Apply `supabase/migrations/20261022_event_access_waitlist.sql` in the Supabase SQL editor **before deploying this application revision**. The migration was exercised against disposable PostgreSQL 16, not production. No production credentials are needed by the developer to review this change.

## Before running the migration

Run this read-only inventory and retain its output:

```sql
select id, title, status, forum_id, capacity, starts_at
from public.events order by starts_at desc nulls last;

select event_id, status, count(*)
from public.event_rsvps group by event_id, status order by event_id, status;

select column_name, data_type, is_nullable
from information_schema.columns
where table_schema = 'public' and table_name in ('events', 'event_rsvps')
order by table_name, ordinal_position;
```

The migration preserves existing explicit `is_public` choices. If the column does not exist, or its value is NULL, it defaults to **private**. This intentionally does not guess the audience of old events. Review existing events in the admin editor after migration; mark the intended audience before deploying. Published private events without a forum must be marked public or attached to a forum. For an explicitly reviewed event, the SQL equivalent is:

```sql
-- Replace the UUID with ONE event you have confirmed is public to all members.
-- update public.events set is_public = true where id = '<reviewed-event-uuid>';
```

Do not automatically delete old forum memberships: the old RSVP flow did not record whether a membership predated attendance. This change preserves all memberships and stops creating/removing them through RSVP.

## Behavior

- Public events: any signed-in Parlor member may attend. Only public events enter homepage/upcoming-event/newsletter selections.
- Private events: approved members of the linked forum and event staff may view/register. Private calendar exports require an authenticated browser session.
- Event attendance never admits someone into a private forum. Members may apply through the existing Forums interface. Event notices depend on attendance, not forum access.
- Event creators, forum moderators, Master Admins and Social Admins have automatic access. Social Admin access matches existing forum super-moderator privileges. They receive event reminders and are eligible for event broadcasts, but are excluded from attendee lists, capacity counts and the queue.
- RSVP cancellation preserves its registration history as `cancelled` and never deletes forum membership, moderator roles or the member account.
- Capacity allocation is serialized using an event-row lock. Waitlist ordering uses queue-entry time with deterministic ties; leaving and rejoining goes to the back. Cancellations promote the first eligible waiter automatically. Explicit host promotion may override order but cannot exceed capacity.
- Hosts manage names, statuses, queue positions and confirmation/cancellation from the event detail page. Their panel does not expose email addresses. Existing team-only attendee email access remains separate.
- Raising capacity through the admin editor reconciles the queue immediately for hosts/admins. The existing hourly reminder job also reconciles queues, including after role changes.
- Confirmations, promotions, cancellations and waitlist messages are recorded in an outbox in the registration transaction. The request attempts delivery immediately; the existing hourly Netlify reminder job retries undelivered messages after a ten-minute lease. In-app notifications use a stable ID; email retries carry a stable Resend idempotency key. Resend's own idempotency retention applies; this is not an unlimited exactly-once delivery guarantee.
- Waitlisted people receive an explicitly unconfirmed waitlist reminder, without a meeting link. Hosts/admins receive a separate reminder. Existing confirmed-attendee reminders continue.
- All calendar files omit meeting URLs. Meeting access is available only from the authenticated event page for confirmed attendees or staff.
- Event tables and registration RPCs are server-only. Browser table writes cannot bypass the registration lock. The service-role key must remain server-side.

## Checks after applying (manual)

Use a separate test/staging project and non-delivering email transport where possible. Production RSVP requests can send real email.

1. Private event: an unrelated member cannot list it, open it by ID, RSVP, or download its calendar. A forum member can.
2. Public event in a private forum: an unrelated member can RSVP and receive notices, but cannot read forum content or see the event-discussion link.
3. Capacity one: register two ordinary members. The second sees waitlist position one. Cancel the first; the second becomes confirmed and receives a promotion notice.
4. Confirm cancellation preserves existing forum members and moderators.
5. Hosts/admins see automatic access and the meeting link without appearing in attendees or consuming capacity.
6. Test the host controls on desktop and mobile; full events reject manual promotion.
7. Confirm the existing scheduled `/api/cron/event-reminders` job is enabled and monitor `event_registration_messages.last_error` for delivery failures. No new cron secret is introduced.

Inspection query for outstanding delivery work:

```sql
select kind, count(*) from public.event_registration_messages
where sent_at is null group by kind;
```

## Local validation

```sh
python tests/event-access.py
node --experimental-vm-modules --test tests/event-routes.test.cjs
npm run build
```

The integration test starts and deletes its own isolated PostgreSQL Docker container. It validates repeatable migration, access restrictions, membership preservation, staff exclusion, FIFO/manual promotion, rejoining, and twenty concurrent registrations competing for three places. Mocked route tests require no application credentials. Full Next.js build page-data collection requires the application's existing email/Supabase/Stripe configuration; compilation can finish before that prerequisite fails.
