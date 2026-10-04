-- 0002: lead-magnet telemetry + live_url split
-- Context: the public showcase at / (and /share) becomes a lead magnet. We need
-- (a) a dedicated live-app URL per entry, distinct from the code/repo link, and
-- (b) a table to record outbound click events for popularity ranking.

-- ---------- entries: split the single link into repo_url (code) + live_url (app) ----------
alter table public.entries add column if not exists live_url text;

-- repo_url was NOT NULL (one link was always required). An app can now be
-- live-only (no public repo) or code-only, so relax it; saveEntry enforces the
-- "at least one link" rule at the application layer.
alter table public.entries alter column repo_url drop not null;

-- Backfill: historically the single link lived in repo_url and was EITHER a
-- GitHub repo OR a deployed app. Move the non-GitHub ones into live_url (they
-- are live apps, not code), leaving GitHub links as the code link. Verified at
-- migration time: 40 github.com, 60 non-github, 0 other code hosts.
update public.entries
  set live_url = repo_url,
      repo_url = null
  where repo_url is not null
    and repo_url not ilike '%github.com%';

-- ---------- app_events: outbound click telemetry ----------
-- One row per outbound click on a showcase app link, written by anonymous
-- visitors through the /go/<day> redirect route. Owner-only read.
create table if not exists public.app_events (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid references auth.users(id) on delete cascade,
  event_type text not null default 'click',
  day_number int not null check (day_number between 1 and 100),
  target text,                       -- 'live' | 'code'
  referrer text,
  user_agent text,
  created_at timestamptz not null default now()
);

create index if not exists app_events_day_idx on public.app_events (day_number, created_at desc);
create index if not exists app_events_type_idx on public.app_events (event_type, created_at desc);

alter table public.app_events enable row level security;

-- Anyone (anon or authed) may record a click. No SELECT grant for anon, so
-- traffic data is never publicly readable. (Abuse caveat: inserts are
-- unauthenticated and unrated — bogus/bot events are possible; dedupe + bot
-- filtering happen at analysis time. Tracked in CLAUDE.md Open threads.)
create policy "app_events_insert_any" on public.app_events
  for insert to anon, authenticated with check (true);

-- The showcase owner (authenticated; single-user today) reads their own events.
create policy "app_events_select_owner" on public.app_events
  for select to authenticated using (auth.uid() = owner_user_id);
