-- 0003: per-app waitlist leads, HighLevel sync bookkeeping, admin stats
-- Additive only (new table + functions), so it is safe to apply before the
-- code that uses it is deployed.

-- ---------- app_interest: one row per "notify me" signup ----------
create table if not exists public.app_interest (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  day_number int not null check (day_number between 1 and 100),
  -- Snapshot of the app name at signup time, so a later rename does not
  -- rewrite what the person actually asked about.
  app_name text not null check (char_length(app_name) <= 200),
  first_name text not null check (char_length(first_name) between 1 and 80),
  email text not null check (char_length(email) between 3 and 254),
  phone text check (phone is null or char_length(phone) <= 32),
  sms_consent boolean not null default false,
  sms_consent_at timestamptz,
  -- The exact wording the person agreed to, kept as the consent record.
  consent_text text check (consent_text is null or char_length(consent_text) <= 500),
  referrer text check (referrer is null or char_length(referrer) <= 2000),
  user_agent text check (user_agent is null or char_length(user_agent) <= 1000),
  ghl_contact_id text,
  ghl_sync_status text not null default 'pending'
    check (ghl_sync_status in ('pending', 'synced', 'failed', 'skipped')),
  ghl_sync_error text,
  ghl_synced_at timestamptz,
  last_texted_at timestamptz,
  created_at timestamptz not null default now()
);

-- One signup per person per app. A repeat submit hits this and is treated as
-- "already on the list" instead of creating a duplicate lead.
create unique index if not exists app_interest_owner_email_day_uniq
  on public.app_interest (owner_user_id, lower(email), day_number);
create index if not exists app_interest_owner_created_idx
  on public.app_interest (owner_user_id, created_at desc);

alter table public.app_interest enable row level security;

-- Visitors may add a lead, but only in its initial unsynced state: a direct
-- REST insert cannot forge a "synced" row or a HighLevel contact id.
create policy "app_interest_insert_any" on public.app_interest
  for insert to anon, authenticated
  with check (
    ghl_sync_status = 'pending'
    and ghl_contact_id is null
    and ghl_synced_at is null
    and last_texted_at is null
  );

-- Only the owner can read, update, or remove leads. No anon SELECT: contact
-- details are never publicly readable.
create policy "app_interest_select_owner" on public.app_interest
  for select to authenticated using (auth.uid() = owner_user_id);
create policy "app_interest_update_owner" on public.app_interest
  for update to authenticated
  using (auth.uid() = owner_user_id) with check (auth.uid() = owner_user_id);
create policy "app_interest_delete_owner" on public.app_interest
  for delete to authenticated using (auth.uid() = owner_user_id);

-- The signup runs as the anonymous visitor, who cannot UPDATE the row it just
-- inserted. This function lets that same request record the HighLevel sync
-- outcome. It is deliberately narrow: only sync columns, only for a row still
-- 'pending', and the caller must already know the row's unguessable id (anon
-- cannot list ids).
create or replace function public.record_interest_sync(
  p_id uuid,
  p_status text,
  p_contact_id text,
  p_error text
)
returns void
language sql
security definer
set search_path = public
as $$
  update public.app_interest
     set ghl_sync_status = p_status,
         ghl_contact_id = coalesce(p_contact_id, ghl_contact_id),
         ghl_sync_error = left(p_error, 500),
         ghl_synced_at = case when p_status = 'synced' then now() else ghl_synced_at end
   where id = p_id
     and ghl_sync_status = 'pending'
     and p_status in ('synced', 'failed', 'skipped');
$$;

revoke all on function public.record_interest_sync(uuid, text, text, text) from public;
grant execute on function public.record_interest_sync(uuid, text, text, text) to anon, authenticated;

-- ---------- admin stats (run as the caller, so RLS limits them to the owner) ----------
-- Aggregated in SQL because the REST API caps a response at 1000 rows, which
-- would silently undercount once traffic grows.
create or replace function public.app_click_stats()
returns table (
  day_number int,
  clicks bigint,
  live_clicks bigint,
  code_clicks bigint,
  last_click timestamptz
)
language sql
stable
security invoker
set search_path = public
as $$
  select e.day_number,
         count(*) as clicks,
         count(*) filter (where e.target = 'live') as live_clicks,
         count(*) filter (where e.target = 'code') as code_clicks,
         max(e.created_at) as last_click
    from public.app_events e
   where e.event_type = 'click'
     and e.owner_user_id = auth.uid()
   group by e.day_number;
$$;

create or replace function public.app_interest_stats()
returns table (
  day_number int,
  leads bigint,
  with_phone bigint,
  sms_ok bigint,
  last_signup timestamptz
)
language sql
stable
security invoker
set search_path = public
as $$
  select i.day_number,
         count(*) as leads,
         count(*) filter (where i.phone is not null) as with_phone,
         count(*) filter (where i.sms_consent and i.phone is not null) as sms_ok,
         max(i.created_at) as last_signup
    from public.app_interest i
   where i.owner_user_id = auth.uid()
   group by i.day_number;
$$;

revoke all on function public.app_click_stats() from public, anon;
revoke all on function public.app_interest_stats() from public, anon;
grant execute on function public.app_click_stats() to authenticated;
grant execute on function public.app_interest_stats() to authenticated;
