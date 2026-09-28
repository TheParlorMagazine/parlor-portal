-- Print issue mailings — for Printing Press (print) subscribers. An admin
-- creates a print issue with a scheduled mail-out date, generates a shipment
-- row per active print subscriber (address snapshot), then fills in the tracking
-- number + estimated arrival and marks each shipped — which emails the member.
-- Subscribers see the schedule + tracking in Manage subscription.
-- Service-role API access. Run once in Supabase dashboard → SQL Editor.

create table if not exists print_issues (
  id                  uuid primary key default gen_random_uuid(),
  title               text not null,               -- e.g. "Vol. 2 — Winter 2026"
  issue_number        text,                         -- e.g. "No. 4"
  cover_image_url     text,
  scheduled_mail_date date,                          -- planned mail-out date
  status              text not null default 'scheduled', -- scheduled | mailing | sent
  created_by          uuid references members(id) on delete set null,
  created_at          timestamptz not null default now()
);
create index if not exists print_issues_status_idx on print_issues(status, scheduled_mail_date);

create table if not exists print_shipments (
  id                 uuid primary key default gen_random_uuid(),
  issue_id           uuid not null references print_issues(id) on delete cascade,
  member_id          uuid not null references members(id) on delete cascade,
  status             text not null default 'pending',  -- pending | shipped
  carrier            text,
  tracking_number    text,
  tracking_url       text,
  estimated_arrival  date,
  shipping_address   text,                              -- snapshot at generation
  shipped_at         timestamptz,
  notified_at        timestamptz,                        -- shipped-email sent (dedupe)
  created_at         timestamptz not null default now(),
  unique (issue_id, member_id)
);
create index if not exists print_shipments_issue_idx on print_shipments(issue_id, status);
create index if not exists print_shipments_member_idx on print_shipments(member_id);
