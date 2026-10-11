# Parlor Portal

The member portal and public site for [The Parlor Magazine](https://theparlormagazine.com) — a Next.js App Router application backed by Supabase and deployed to Netlify.

---

## Stack

| Layer | Technology |
|---|---|
| Framework | Next.js (App Router, `'use client'` where needed) |
| Database & Auth | Supabase (PostgreSQL + Auth) |
| Email delivery | Resend |
| Payments | Stripe (live keys only — no test mode) |
| Print fulfillment | Printify (auto dropship via webhook) |
| Deployment | Netlify (production: `theparlormagazine.com`) |
| Old portal backend | Vercel (`parlor-portal.vercel.app`) — Airtable API, legacy only |

---

## Environment variables

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

STRIPE_SECRET_KEY=                    # sk_live only — never test keys
STRIPE_WEBHOOK_SECRET=
STRIPE_READERS_CIRCLE_PRICE_ID=
STRIPE_PRINTING_PRESS_PRICE_ID=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=

RESEND_API_KEY=
# RESEND_FROM=The Parlor <hello@theparlormagazine.com>   ← uncomment once domain is verified in Resend
RESEND_FROM=The Parlor <onboarding@resend.dev>           # use during testing (Resend test mode)

NEXT_PUBLIC_SITE_URL=http://localhost:3000               # set to https://theparlormagazine.com in prod

PRINTIFY_API_TOKEN=
CRON_SECRET=
SHIPPO_API_KEY=
SHIP_FROM_STREET=
SHIP_FROM_CITY=
SHIP_FROM_STATE=
SHIP_FROM_ZIP=
SHIP_FROM_COUNTRY=
```

> **Stripe:** local dev shares live Stripe + prod Supabase. There is no test/staging environment.
>
> **Resend in testing:** emails only deliver to the address you signed up to Resend with until a domain is verified. Resend is purely a delivery pipe — contacts are never stored there; Supabase is the source of truth.

---

## Deployment

- Production deploys from **`main`** on Netlify only.
- Pushing the `member-portal` branch (or any other branch) does **not** trigger a deploy.
- Never commit `.env.local` — set env vars in the Netlify dashboard for production.

---

## Auth flows

### Sign-up
`/signup` → Supabase creates auth user → Welcome email via Resend → redirect to portal.

If the email is already registered, redirects to `/login?email=...` instead of showing an error.

### Login
`/login` → `supabase.auth.signInWithPassword` → checks `full_name` → if missing, redirects to `/portal/setup?next=<destination>` (first-login name prompt) → then lands at destination.

### Magic link (subscribe wall)
Article subscribe wall (`SubscribeWall.js`) → POST `/api/auth/check-email`:
- **Email not found** → redirect to `/signup`
- **Email found** → `supabase.auth.admin.generateLink({ type: 'magiclink' })` (server-side, does not send email) → `sendMagicLinkEmail` via Resend → show "Check your inbox" state

Magic link lands at `/auth/callback` → `exchangeCodeForSession` → checks `full_name` → if missing, `/portal/setup?next=<destination>`.

> Resend is used for magic links to bypass Supabase's 2 emails/hour free-plan cap.

### Password reset
`/forgot` → POST `/api/auth/send-reset` → `admin.generateLink({ type: 'recovery' })` → `sendPasswordResetEmail` via Resend → branded email with reset link.

### First-login name prompt
`/portal/setup` — fires when `full_name` is null after any sign-in path (magic link, password login, or OAuth callback). Saves name via PATCH `/api/portal/profile`, then redirects to `?next=` param.

---

## Email system

All transactional email goes through `lib/emails.js` → `lib/sendEmail.js` → Resend.

`deliver()` is the single choke point: it checks the automation toggle in `email_automations`, applies any admin template override from `email_templates`, sends via Resend, and increments the send counter.

| Type key | Email | Critical |
|---|---|---|
| `welcome` | Welcome email on sign-up | No |
| `weekly_digest` | Bi-weekly portal activity digest | No |
| `password_reset` | Password reset link | **Yes** |
| `magic_link` | Magic link sign-in (subscribe wall) | **Yes** |
| `payment_confirmed` | Payment receipt | **Yes** |
| `payment_failed` | Payment failure notice | **Yes** |
| `plan_upgraded` | Plan upgrade confirmation | No |
| `cancellation` | Membership cancellation | No |
| `event_rsvp` | RSVP confirmation | No |
| `event_reminder` | Pre-event reminder | No |
| `forum_invite` | Forum invite | No |
| `order_shipped` | Shop order shipped | No |
| `print_shipped` | Print issue shipped | No |

Critical emails always send regardless of the toggle. Non-critical emails respect the toggle in the admin Email Management panel.

The Newsletter is a living Resend template (not a campaign) — it is managed separately from the transactional system.

---

## Member access tiers

Access is checked via `hasPaidAccess()` in `lib/plans.js`.

| Feature | Free member | Reader's Circle / Printing Press |
|---|---|---|
| Read articles (non-paywalled) | ✓ | ✓ |
| Portal access | ✓ | ✓ |
| Reading Room — current book preview | ✓ | ✓ |
| Reading Room — discussions & full shelf | ✗ | ✓ |
| Forums (invite-gated) | Join & read | Join, read & post |
| Reading Room detail pages | Upgrade prompt | ✓ |

---

## Member library

Members' saved articles live in the `articles` table via `in_library` (boolean) and `theme` (string) columns — migrated from Airtable. The Library page at `/portal/library` reads from this table.

---

## Community (forums & Reading Room)

- **Forums** (`/portal/forums`) — invite-gated discussion groups. Free members can join and read; participation (posting) requires a paid plan.
- Each forum has members with roles: `member` or `host` (moderator).
- Destructive forum actions (remove member, make/remove moderator) are all gated behind confirmation dialogs.
- **Reading Room** (`/portal/reading-room`) — book club. Free members see the current book cover, author, blurb, and "Get the book" link but get an upgrade prompt instead of discussions. The past shelf is blurred. Detail pages (`/portal/reading-room/[id]`) hard-gate free members before rendering any content.
- **Discussions** (forums) are hidden until 5 members have joined a thread.

---

## Member posts

`/portal/write` → creates a `member_submissions` record.

Submissions go through an admin review step with two approval paths:
- **Approve for verticals** — queues for a vertical section
- **Approve as post** — publishes directly

A disclaimer + author approval gate must pass before anything goes live.

---

## Shop

- Product catalogue in `shop_products` table, managed via admin CRUD.
- In-app Stripe checkout with geo currency detection.
- Printify handles fulfillment automatically via order webhook (full auto dropship).
- Shipped notifications sent via `sendOrderShippedEmail` (Resend).

---

## Legacy portal (to be deleted before launch)

`parlor-portal.vercel.app` is the old member portal, built on Airtable as the data backend. It is still live but will be fully decommissioned before the new portal launches.

**What it does / did:**
- Served as the original member-facing portal before the Supabase migration
- Used Airtable as the database (members, articles, library entries)
- Member library data was migrated from Airtable into the `articles` table (`in_library`, `theme` columns) in Supabase

**Pre-launch checklist:**
- [ ] Confirm all Airtable data has been fully migrated to Supabase
- [ ] Remove `AIRTABLE_TOKEN` from `.env.local` and Netlify env vars
- [ ] Take down / delete the Vercel project at `parlor-portal.vercel.app`
- [ ] Remove any remaining Airtable API calls from this codebase (`grep -r "airtable" .`)

---

## Back-navigation quirk (dev only)

Hitting Back after navigating away from a page sometimes shows a blank/dead page in the Turbopack dev server. This is a Turbopack dev-only issue and does not occur in production builds.

---

## Running locally

```bash
npm install
npm run dev
```

Server starts at `http://localhost:3000`.
