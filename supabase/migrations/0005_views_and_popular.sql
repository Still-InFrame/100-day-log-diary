-- 0005: view tracking and the public "Most popular" ranking
-- Additive only (a defaulted column, an index, new functions), so it is safe
-- to apply before the code that uses it ships.

-- Where on the page an event happened. Only 'list' events (the shuffled list
-- every visitor sees in a different order) count toward the ranking. Clicks
-- from the "Most popular" row are stored as 'popular' and left out, so an app
-- cannot hold its place just because it is displayed at the top.
alter table public.app_events
  add column if not exists source text not null default 'list'
  check (source in ('list', 'popular'));

-- event_type now also takes 'impression' (a card seen on a public page).
create index if not exists app_events_owner_type_day_idx
  on public.app_events (owner_user_id, event_type, day_number);

-- Per-app views and clicks for the signed-in user's own admin.
-- SECURITY INVOKER: RLS limits the rows to the caller's own.
create or replace function public.app_engagement_stats()
returns table (
  day_number int,
  views bigint,
  clicks bigint,
  live_clicks bigint,
  code_clicks bigint,
  popular_clicks bigint,
  last_click timestamptz
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
         max(e.created_at) filter (where e.event_type = 'click') as last_click
    from public.app_events e
   where e.owner_user_id = auth.uid()
   group by e.day_number;
$$;

revoke all on function public.app_engagement_stats() from public, anon;
grant execute on function public.app_engagement_stats() to authenticated;

-- Which of one user's apps are currently "most popular". Public, because the
-- result is shown on that user's public page. It returns day numbers only,
-- never counts, and only for users who have published a page.
--
-- The bar (10 clicks, 50 views) and the size (top 3) are fixed here rather
-- than passed in, so an anonymous caller cannot lower the bar to read the
-- ordering early. Keep them in step with POPULAR_* in lib/constants.ts.
create or replace function public.popular_apps(p_owner uuid)
returns table (day_number int)
language sql
stable
security definer
set search_path = public
as $$
  with s as (
    select e.day_number,
           count(*) filter (where e.event_type = 'impression' and e.source = 'list') as views,
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
   where s.clicks >= 10
     and s.views >= 50
     and exists (
       select 1 from public.profiles p
        where p.user_id = p_owner and p.public_handle is not null
     )
   order by (s.clicks::numeric / s.views) desc,
            coalesce(l.leads, 0) desc,
            s.clicks desc,
            s.day_number
   limit 3;
$$;

revoke all on function public.popular_apps(uuid) from public;
grant execute on function public.popular_apps(uuid) to anon, authenticated;
