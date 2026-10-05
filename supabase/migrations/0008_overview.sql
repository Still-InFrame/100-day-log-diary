-- 0008: where visitors are (country, state, city), and one function that
-- feeds the admin overview dashboard
-- Safe to apply before the code that uses it ships: the new columns are
-- nullable and nothing deployed reads them or calls the function.

-- Where a view, click or signup came from. Read from headers the host adds
-- to each request (its own lookup of the visitor's address); the IP address
-- itself is not stored. All NULL for everything recorded before this
-- migration, and whenever the host cannot tell.
--   country  two-letter code, ISO 3166-1 alpha-2 ("US")
--   region   state or province, the part of ISO 3166-2 after the dash ("FL")
--   city     city name as the host reports it ("Miami")
--   lat/lon  the city's approximate position, kept to one decimal place
--            (about 11 km), only so cities can be drawn on a map. Events
--            only: signups, which carry a name, do not get coordinates.
alter table public.app_events
  add column if not exists country text
    check (country is null or country ~ '^[A-Z]{2}$'),
  add column if not exists region text
    check (region is null or region ~ '^[A-Z0-9]{1,3}$'),
  add column if not exists city text
    check (city is null or char_length(city) between 1 and 100),
  add column if not exists lat numeric(3, 1)
    check (lat is null or lat between -90 and 90),
  add column if not exists lon numeric(4, 1)
    check (lon is null or lon between -180 and 180);

alter table public.app_interest
  add column if not exists country text
    check (country is null or country ~ '^[A-Z]{2}$'),
  add column if not exists region text
    check (region is null or region ~ '^[A-Z0-9]{1,3}$'),
  add column if not exists city text
    check (city is null or char_length(city) between 1 and 100);

-- A first draft of this function took a number of days instead of two dates.
-- It was applied to production but no deployed code ever called it. Removed
-- here so only one version exists.
drop function if exists public.app_overview(int, text);

-- Everything the overview shows, for one date range, in one call, so the
-- tiles, the trend chart and the per-app lists always describe the same
-- slice of data. Returns JSON:
--   totals: views, unique_views, clicks, unique_clicks, live_clicks,
--           code_clicks, signups
--   daily:  one row per calendar day in the range (zeros included):
--           day, views, unique_views, clicks, unique_clicks, signups
--   apps:   one row per app with any activity in the range:
--           day_number, views, unique_views, clicks, unique_clicks, signups,
--           popular_clicks, last_click
--   countries: one row per country with any activity in the range, plus a
--           row with country NULL for activity whose country is not known:
--           country, views, unique_views, clicks, unique_clicks, signups
--   regions: the same figures per country + region, busiest 500
--   cities:  the same figures per country + region + city, plus lat/lon,
--           busiest 500
--
-- p_from  first day of the range; NULL means from the beginning.
-- p_to    last day of the range, included; NULL means today.
-- p_tz    the timezone that decides where a "day" starts and ends.
--
-- Counts follow the ranking's rules: only events from the shuffled list
-- (clicks made from the "Most popular" row are left out), and "unique"
-- counts people (distinct visitor IDs, plus one per event with no ID).
-- The two exceptions are on app rows, matching app_engagement_stats():
-- popular_clicks counts clicks made from the "Most popular" row, and
-- last_click is the latest click of either kind.
-- A unique figure is per row: the same person on two days counts once in
-- totals and once on each of those days, so daily rows do not add up to it.
-- SECURITY INVOKER: RLS limits every row to the caller's own.
create or replace function public.app_overview(
  p_from date default null,
  p_to date default null,
  p_tz text default 'America/New_York'
)
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
  with bounds as (
    -- A last day in the future is pulled back to today.
    select least(coalesce(p_to, t.today), t.today) as last_day
      from (select (now() at time zone p_tz)::date as today) t
  ),
  win as (
    select b.last_day,
           -- A first day after the last day becomes that single day. Capped
           -- at a year: the function is callable directly, and an oversized
           -- range would build an enormous day series.
           case when p_from is null then null
                else greatest(least(p_from, b.last_day), b.last_day - 365)
           end as first_day
      from bounds b
  ),
  edges as (
    select w.first_day,
           w.last_day,
           -- The range as real instants (midnight to midnight in p_tz), so
           -- rows are filtered on created_at itself. `until` is exclusive.
           (w.first_day::timestamp at time zone p_tz) as since,
           ((w.last_day + 1)::timestamp at time zone p_tz) as until
      from win w
  ),
  ev_all as (
    select e.event_type, e.day_number, e.target, e.visitor_id,
           e.source, e.created_at,
           -- '' stands for "not known": the full joins below need a plain
           -- equality, which NULL would never satisfy.
           coalesce(e.country, '') as country,
           coalesce(e.region, '') as region,
           coalesce(e.city, '') as city,
           e.lat, e.lon,
           (e.created_at at time zone p_tz)::date as local_day
      from public.app_events e
     cross join edges x
     where e.owner_user_id = auth.uid()
       and e.created_at < x.until
       and (x.since is null or e.created_at >= x.since)
  ),
  -- What everything except the two app-row exceptions is counted from.
  ev as (
    select * from ev_all where source = 'list'
  ),
  ld as (
    select i.day_number,
           coalesce(i.country, '') as country,
           coalesce(i.region, '') as region,
           coalesce(i.city, '') as city,
           (i.created_at at time zone p_tz)::date as local_day
      from public.app_interest i
     cross join edges x
     where i.owner_user_id = auth.uid()
       and i.created_at < x.until
       and (x.since is null or i.created_at >= x.since)
  ),
  -- With no first day, the daily series starts at the first recorded day,
  -- but never shows fewer than seven days (a one-day chart is a dot) or more
  -- than a year.
  span as (
    select case
             when x.first_day is not null then x.first_day
             else greatest(
                    least(
                      coalesce((select min(local_day) from ev), x.last_day),
                      coalesce((select min(local_day) from ld), x.last_day),
                      x.last_day - 6
                    ),
                    x.last_day - 365
                  )
           end as first_day,
           x.last_day
      from edges x
  ),
  days as (
    select generate_series(s.first_day, s.last_day, interval '1 day')::date as day
      from span s
  ),
  ev_daily as (
    select local_day as day,
           count(*) filter (where event_type = 'impression') as views,
           count(distinct visitor_id) filter (where event_type = 'impression')
             + count(*) filter (where event_type = 'impression' and visitor_id is null) as unique_views,
           count(*) filter (where event_type = 'click') as clicks,
           count(distinct visitor_id) filter (where event_type = 'click')
             + count(*) filter (where event_type = 'click' and visitor_id is null) as unique_clicks
      from ev
     group by local_day
  ),
  ld_daily as (
    select local_day as day, count(*) as signups from ld group by local_day
  ),
  ev_apps as (
    select day_number,
           count(*) filter (where source = 'list' and event_type = 'impression') as views,
           count(distinct visitor_id) filter (where source = 'list' and event_type = 'impression')
             + count(*) filter (where source = 'list' and event_type = 'impression' and visitor_id is null) as unique_views,
           count(*) filter (where source = 'list' and event_type = 'click') as clicks,
           count(distinct visitor_id) filter (where source = 'list' and event_type = 'click')
             + count(*) filter (where source = 'list' and event_type = 'click' and visitor_id is null) as unique_clicks,
           count(*) filter (where source = 'popular' and event_type = 'click') as popular_clicks,
           max(created_at) filter (where event_type = 'click') as last_click
      from ev_all
     group by day_number
  ),
  ld_apps as (
    select day_number, count(*) as signups from ld group by day_number
  ),
  ev_geo as (
    select country,
           count(*) filter (where event_type = 'impression') as views,
           count(distinct visitor_id) filter (where event_type = 'impression')
             + count(*) filter (where event_type = 'impression' and visitor_id is null) as unique_views,
           count(*) filter (where event_type = 'click') as clicks,
           count(distinct visitor_id) filter (where event_type = 'click')
             + count(*) filter (where event_type = 'click' and visitor_id is null) as unique_clicks
      from ev
     group by country
  ),
  ld_geo as (
    select country, count(*) as signups from ld group by country
  ),
  ev_region as (
    select country, region,
           count(*) filter (where event_type = 'impression') as views,
           count(distinct visitor_id) filter (where event_type = 'impression')
             + count(*) filter (where event_type = 'impression' and visitor_id is null) as unique_views,
           count(*) filter (where event_type = 'click') as clicks,
           count(distinct visitor_id) filter (where event_type = 'click')
             + count(*) filter (where event_type = 'click' and visitor_id is null) as unique_clicks
      from ev
     where country <> ''
     group by country, region
  ),
  ld_region as (
    select country, region, count(*) as signups
      from ld
     where country <> ''
     group by country, region
  ),
  ev_city as (
    select country, region, city,
           count(*) filter (where event_type = 'impression') as views,
           count(distinct visitor_id) filter (where event_type = 'impression')
             + count(*) filter (where event_type = 'impression' and visitor_id is null) as unique_views,
           count(*) filter (where event_type = 'click') as clicks,
           count(distinct visitor_id) filter (where event_type = 'click')
             + count(*) filter (where event_type = 'click' and visitor_id is null) as unique_clicks,
           round(avg(lat), 1) as lat,
           round(avg(lon), 1) as lon
      from ev
     where country <> '' and city <> ''
     group by country, region, city
  ),
  ld_city as (
    select country, region, city, count(*) as signups
      from ld
     where country <> '' and city <> ''
     group by country, region, city
  )
  select jsonb_build_object(
    'totals', (
      select jsonb_build_object(
        'views', count(*) filter (where event_type = 'impression'),
        'unique_views',
          count(distinct visitor_id) filter (where event_type = 'impression')
            + count(*) filter (where event_type = 'impression' and visitor_id is null),
        'clicks', count(*) filter (where event_type = 'click'),
        'unique_clicks',
          count(distinct visitor_id) filter (where event_type = 'click')
            + count(*) filter (where event_type = 'click' and visitor_id is null),
        'live_clicks', count(*) filter (where event_type = 'click' and target = 'live'),
        'code_clicks', count(*) filter (where event_type = 'click' and target = 'code'),
        'signups', (select count(*) from ld)
      )
      from ev
    ),
    'daily', (
      select coalesce(jsonb_agg(
               jsonb_build_object(
                 'day', d.day,
                 'views', coalesce(e.views, 0),
                 'unique_views', coalesce(e.unique_views, 0),
                 'clicks', coalesce(e.clicks, 0),
                 'unique_clicks', coalesce(e.unique_clicks, 0),
                 'signups', coalesce(l.signups, 0)
               ) order by d.day), '[]'::jsonb)
        from days d
        left join ev_daily e on e.day = d.day
        left join ld_daily l on l.day = d.day
    ),
    'apps', (
      select coalesce(jsonb_agg(
               jsonb_build_object(
                 'day_number', coalesce(a.day_number, l.day_number),
                 'views', coalesce(a.views, 0),
                 'unique_views', coalesce(a.unique_views, 0),
                 'clicks', coalesce(a.clicks, 0),
                 'unique_clicks', coalesce(a.unique_clicks, 0),
                 'signups', coalesce(l.signups, 0),
                 'popular_clicks', coalesce(a.popular_clicks, 0),
                 'last_click', a.last_click
               )), '[]'::jsonb)
        from ev_apps a
        full join ld_apps l on l.day_number = a.day_number
    ),
    'countries', (
      select coalesce(jsonb_agg(
               jsonb_build_object(
                 'country', nullif(coalesce(g.country, l.country), ''),
                 'views', coalesce(g.views, 0),
                 'unique_views', coalesce(g.unique_views, 0),
                 'clicks', coalesce(g.clicks, 0),
                 'unique_clicks', coalesce(g.unique_clicks, 0),
                 'signups', coalesce(l.signups, 0)
               )), '[]'::jsonb)
        from ev_geo g
        full join ld_geo l on l.country = g.country
    ),
    'regions', (
      select coalesce(jsonb_agg(to_jsonb(r)), '[]'::jsonb)
        from (
          select country,
                 nullif(region, '') as region,
                 coalesce(g.views, 0) as views,
                 coalesce(g.unique_views, 0) as unique_views,
                 coalesce(g.clicks, 0) as clicks,
                 coalesce(g.unique_clicks, 0) as unique_clicks,
                 coalesce(l.signups, 0) as signups
            from ev_region g
            full join ld_region l using (country, region)
           order by 4 desc, 6 desc, 7 desc
           limit 500
        ) r
    ),
    'cities', (
      select coalesce(jsonb_agg(to_jsonb(c)), '[]'::jsonb)
        from (
          select country,
                 nullif(region, '') as region,
                 city,
                 g.lat, g.lon,
                 coalesce(g.views, 0) as views,
                 coalesce(g.unique_views, 0) as unique_views,
                 coalesce(g.clicks, 0) as clicks,
                 coalesce(g.unique_clicks, 0) as unique_clicks,
                 coalesce(l.signups, 0) as signups
            from ev_city g
            full join ld_city l using (country, region, city)
           order by 7 desc, 9 desc, 10 desc
           limit 500
        ) c
    )
  );
$$;

revoke all on function public.app_overview(date, date, text) from public, anon;
grant execute on function public.app_overview(date, date, text) to authenticated;
