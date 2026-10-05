-- 0007: count people, not just events
-- Safe to apply before the code that uses it ships: the new column is
-- nullable, app_engagement_stats() returns a superset of its old columns,
-- and popular_apps() keeps its signature.

-- A random ID generated in the visitor's browser (see ViewTracker). It carries
-- no name, email or address, and is never linked to a signup. It exists so
-- the same browser reloading or clicking repeatedly counts as one person.
alter table public.app_events
  add column if not exists visitor_id text
  check (visitor_id is null or visitor_id ~ '^[A-Za-z0-9-]{8,64}$');

create index if not exists app_events_owner_type_day_visitor_idx
  on public.app_events (owner_user_id, event_type, day_number, visitor_id);

-- "People" throughout = distinct visitor IDs, plus one per event that has no
-- ID (events recorded before this migration, or a click from a browser where
-- the ID could not be attached). Counting those individually keeps the
-- numbers from going DOWN for data that predates IDs.

-- Return type changes, so the function is dropped and recreated (atomically,
-- inside this migration's transaction). New columns are added at the end.
drop function if exists public.app_engagement_stats();

create function public.app_engagement_stats()
returns table (
  day_number int,
  views bigint,
  clicks bigint,
  live_clicks bigint,
  code_clicks bigint,
  popular_clicks bigint,
  last_click timestamptz,
  unique_views bigint,
  unique_clicks bigint
)
language sql
stable
security invoker
set search_path = public
as $$
  select e.day_number,
         count(*) filter (where e.event_type = 'impression' and e.source = 'list') as views,
         count(*) filter (where e.event_type = 'click' and e.source = 'list') as clicks,
         count(*) filter (where e.event_type = 'click' and e.source = 'list' and e.target = 'live') as live_clicks,
         count(*) filter (where e.event_type = 'click' and e.source = 'list' and e.target = 'code') as code_clicks,
         count(*) filter (where e.event_type = 'click' and e.source = 'popular') as popular_clicks,
         max(e.created_at) filter (where e.event_type = 'click') as last_click,
         count(distinct e.visitor_id) filter (where e.event_type = 'impression' and e.source = 'list')
           + count(*) filter (where e.event_type = 'impression' and e.source = 'list' and e.visitor_id is null) as unique_views,
         count(distinct e.visitor_id) filter (where e.event_type = 'click' and e.source = 'list')
           + count(*) filter (where e.event_type = 'click' and e.source = 'list' and e.visitor_id is null) as unique_clicks
    from public.app_events e
   where e.owner_user_id = auth.uid()
   group by e.day_number;
$$;

revoke all on function public.app_engagement_stats() from public, anon;
grant execute on function public.app_engagement_stats() to authenticated;

-- Whole-page totals for the signed-in user: how many different people saw or
-- clicked ANY app. These cannot be had by adding up the per-app numbers,
-- because one person usually sees several apps.
create or replace function public.app_visitor_totals()
returns table (
  views bigint,
  clicks bigint,
  people_saw bigint,
  people_clicked bigint
)
language sql
stable
security invoker
set search_path = public
as $$
  select count(*) filter (where e.event_type = 'impression' and e.source = 'list') as views,
         count(*) filter (where e.event_type = 'click' and e.source = 'list') as clicks,
         count(distinct e.visitor_id) filter (where e.event_type = 'impression' and e.source = 'list')
           + count(*) filter (where e.event_type = 'impression' and e.source = 'list' and e.visitor_id is null) as people_saw,
         count(distinct e.visitor_id) filter (where e.event_type = 'click' and e.source = 'list')
           + count(*) filter (where e.event_type = 'click' and e.source = 'list' and e.visitor_id is null) as people_clicked
    from public.app_events e
   where e.owner_user_id = auth.uid();
$$;

revoke all on function public.app_visitor_totals() from public, anon;
grant execute on function public.app_visitor_totals() to authenticated;

-- "Most popular", now ranked on people:
--   * to be ranked, an app needs 10 different people to have clicked it and
--     50 different people to have seen it;
--   * the score is the share of people who saw it and clicked it, compared
--     to the nearest whole percent;
--   * apps on the same percent are ordered by repeat clicks (people coming
--     back to the same app), then by signups.
-- The bar and the size stay fixed in here so an anonymous caller cannot
-- lower them. Keep them in step with POPULAR_* in lib/constants.ts.
create or replace function public.popular_apps(p_owner uuid)
returns table (day_number int)
language sql
stable
security definer
set search_path = public
as $$
  with s as (
    select e.day_number,
           count(distinct e.visitor_id) filter (where e.event_type = 'impression' and e.source = 'list')
             + count(*) filter (where e.event_type = 'impression' and e.source = 'list' and e.visitor_id is null) as people_saw,
           count(distinct e.visitor_id) filter (where e.event_type = 'click' and e.source = 'list')
             + count(*) filter (where e.event_type = 'click' and e.source = 'list' and e.visitor_id is null) as people_clicked,
           count(*) filter (where e.event_type = 'click' and e.source = 'list') as clicks
      from public.app_events e
     where e.owner_user_id = p_owner
     group by e.day_number
  ),
  l as (
    select i.day_number, count(*) as leads
      from public.app_interest i
     where i.owner_user_id = p_owner
     group by i.day_number
  )
  select s.day_number
    from s
    left join l on l.day_number = s.day_number
   where s.people_clicked >= 10
     and s.people_saw >= 50
     and exists (
       select 1 from public.profiles p
        where p.user_id = p_owner and p.public_handle is not null
     )
   order by round(s.people_clicked::numeric / s.people_saw, 2) desc,
            (s.clicks - s.people_clicked) desc,
            coalesce(l.leads, 0) desc,
            s.day_number
   limit 3;
$$;

revoke all on function public.popular_apps(uuid) from public;
grant execute on function public.popular_apps(uuid) to anon, authenticated;
