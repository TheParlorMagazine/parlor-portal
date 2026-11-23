# Film Club follow-up rollout

These updates add branded email previews without requiring Resend credentials merely to render them, a pre-screening reminder for confirmed Kinema buyers and confirmed RSVPs, and a name/email form for paid-member complimentary RSVPs. Contact information is saved atomically with RSVP seat/waitlist assignment and is visible only through the existing staff-gated attendee endpoint. Ordinary event RSVP and cancellation routes remain available.

Apply these included migrations in order through the normal database deployment process, after the Film Club migrations already included in main:

1. `supabase/migrations/20261121110500_film_club_screening_reminders.sql`
2. `supabase/migrations/20261121110600_film_club_rsvp_contact.sql`

The second migration depends on the first and updates both reminder and discussion audiences to use the submitted RSVP email. These migrations create new objects and are intended to be applied once by the migration runner. If already applied, verify migration history rather than manually rerunning them. Merging the branch does not apply production SQL. Without the contact migration, new Film Club RSVP submissions cannot use the contact-saving RPC; general event registrations remain on their existing RPC. No live database changes or email sends were performed during this review.

The reminder job uses the existing authorized event-reminder cron endpoint. Delivery claims deduplicate overlapping ticket-buyer/RSVP audiences, and the sender retains stable idempotency keys. Waitlisted and staff attendees are excluded from confirmed-attendee reminders. Admin automation switches still control sending; disabled or failed deliveries are not marked sent.

Validation includes the JavaScript suite, a production build, responsive RSVP browser fixtures, `tests/event-access.py`, and `tests/film-club-updates-db.py` against disposable PostgreSQL containers. The latter checks the actual new migrations, paid eligibility, contact persistence, capacity/waitlists, concurrent reminder claims, post-screening contact selection and database-role restrictions. Browser and email tests use local fixtures and do not validate live Kinema/Resend integrations.
