-- Pause for Shabbat — Supabase schema.
-- Run once in Supabase → SQL Editor on a fresh project.

create table if not exists public.users (
  email         text primary key,          -- upsert key (onConflict: 'email')
  timezone      text not null,             -- Windows time zone name from Outlook, e.g. "Eastern Standard Time"
  access_token  text,
  refresh_token text,
  active        boolean not null default true,
  created_at    timestamptz not null default now()
);

-- Lock the table down: with RLS on and no policies, only the service-role key
-- can read or write. Set SUPABASE_KEY in Vercel to the *service_role* key
-- (Project Settings → API), not the anon key, or the app will get empty results.
alter table public.users enable row level security;
