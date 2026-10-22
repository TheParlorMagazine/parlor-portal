-- Minimal isolated fixture; never run this file against an application database.
create role anon;create role authenticated;create role service_role bypassrls;
create extension if not exists pgcrypto;
create table members(id uuid primary key,role text,full_name text,email text);
create table forums(id uuid primary key,status text default 'active');
create table forum_members(forum_id uuid,member_id uuid,role text,primary key(forum_id,member_id));
create table events(id uuid primary key default gen_random_uuid(),title text,status text default 'published',forum_id uuid,created_by uuid,capacity integer,starts_at timestamptz default now()+interval '1 day',ends_at timestamptz,join_url text);
create table event_rsvps(event_id uuid references events(id),member_id uuid references members(id),status text,reminded_at timestamptz,created_at timestamptz default now(),primary key(event_id,member_id));
