-- 0010: where visitors came from (traffic source)
-- Safe to apply before the code that uses it ships: the new columns are
-- nullable or defaulted, and app_overview() keeps everything it returned
-- before and adds three keys.

-- What a visit arrived with, noted by the page's script when the visitor
-- lands (see lib/traffic-source.ts) and stored on that visit's views, clicks
-- and signups.
--   source_known  true when the script reported a source, even an empty
--                 one. False for everything recorded before this migration
--                 and for clicks made with scripts blocked, so "no source
--                 came with the visit" (direct) can be told apart from
--                 "nobody looked".
--   ref_host      the other site that linked here: host only, no path, no
--                 "www." ("google.com", "t.co"). NULL if none.
--   utm_source / utm_medium / utm_campaign
--                 the tags on the link, lower-cased. NULL if absent.
--   ad_click      which ad network's click marker was on the link ("google",
--                 "microsoft", ...). The marker itself is not stored.
alter table public.app_events
  add column if not exists source_known boolean not null default false,
  add column if not exists ref_host text
    check (ref_host is null or char_length(ref_host) between 1 and 100),
  add column if not exists utm_source text
    check (utm_source is null or char_length(utm_source) between 1 and 80),
  add column if not exists utm_medium text
    check (utm_medium is null or char_length(utm_medium) between 1 and 80),
  add column if not exists utm_campaign text
    check (utm_campaign is null or char_length(utm_campaign) between 1 and 80),
  add column if not exists ad_click text
    check (ad_click is null or ad_click ~ '^[a-z]{1,20}$');

alter table public.app_interest
  add column if not exists source_known boolean not null default false,
  add column if not exists ref_host text
    check (ref_host is null or char_length(ref_host) between 1 and 100),
  add column if not exists utm_source text
    check (utm_source is null or char_length(utm_source) between 1 and 80),
  add column if not exists utm_medium text
    check (utm_medium is null or char_length(utm_medium) between 1 and 80),
  add column if not exists utm_campaign text
    check (utm_campaign is null or char_length(utm_campaign) between 1 and 80),
  add column if not exists ad_click text
    check (ad_click is null or ad_click ~ '^[a-z]{1,20}$');

-- The side table holds whole app_events rows, so it gets the same columns.
-- They land after its own removed_at / removed_reason, so from here on the
-- two tables no longer share a column order: a move into it must name its
-- columns and cannot use "select *" the way migration 0009 did.
alter table public.app_events_removed
  add column if not exists source_known boolean not null default false,
  add column if not exists ref_host text,
  add column if not exists utm_source text,
  add column if not exists utm_medium text,
  add column if not exists utm_campaign text,
  add column if not exists ad_click text;

-- Sorts a visit into one channel. The raw facts are stored and the sorting
-- happens here, at read time, so these rules can be changed later and every
-- past visit is re-sorted with them. The first rule that fits wins:
--   unknown   no source was recorded for the visit
--   paid      an ad network's click marker, or a paid medium tag
--   email     an email medium / source tag, or a webmail site
--   sms       a text-message medium / source tag
--   ai        an AI assistant (ChatGPT tags its links itself)
--   social    a social medium tag, a social site or app, or a social source
--             tag with no medium
--   search    an "organic" medium tag or a search engine
--   referral  any other site
--   campaign  tagged, but with tags none of the rules know
--   direct    nothing came with the visit: a typed or bookmarked address,
--             and most links opened from text messages and apps
create or replace function public.traffic_channel(
  p_known boolean,
  p_ref_host text,
  p_utm_source text,
  p_utm_medium text,
  p_ad_click text
)
returns text
language sql
immutable
set search_path = ''
as $$
  select case
    when not coalesce(p_known, false) then 'unknown'
    when p_ad_click is not null
      or x.m ~ '^(.*cp.*|ppc|paid.*|.*paid|retargeting|remarketing|display|banner)$'
      then 'paid'
    when x.m in ('email', 'e-mail', 'e_mail', 'newsletter')
      or x.s in ('email', 'newsletter')
      or x.h ~ '(^|\.)(mail\.google\.com|mail\.yahoo\.com|outlook\.live\.com|outlook\.office\.com|outlook\.office365\.com)$'
      or x.h = 'com.google.android.gm'
      then 'email'
    when x.m in ('sms', 'text', 'mms') or x.s in ('sms', 'text') then 'sms'
    when x.s ~ '^(chatgpt|chatgpt\.com|openai|perplexity|perplexity\.ai|claude|claude\.ai|gemini|copilot)$'
      or x.h ~ '(^|\.)(chatgpt\.com|chat\.openai\.com|perplexity\.ai|claude\.ai|gemini\.google\.com|copilot\.microsoft\.com|you\.com|phind\.com)$'
      then 'ai'
    when x.m in ('social', 'social-media', 'social_media', 'social-network', 'social_network', 'sm', 'organic-social', 'organic_social')
      or x.h ~ '(^|\.)(facebook\.com|instagram\.com|t\.co|x\.com|twitter\.com|linkedin\.com|lnkd\.in|tiktok\.com|youtube\.com|youtu\.be|reddit\.com|pinterest\.com|threads\.net|threads\.com|bsky\.app|snapchat\.com|discord\.com|t\.me|telegram\.org|whatsapp\.com|wa\.me|linktr\.ee)$'
      or x.h ~ '^com\.(facebook|instagram|twitter|linkedin|reddit|pinterest|zhiliaoapp|ss\.android\.ugc|snapchat)\.'
      or (x.m = '' and x.s ~ '^(facebook|fb|instagram|ig|twitter|x|linkedin|tiktok|youtube|reddit|pinterest|threads|bluesky|snapchat|discord|telegram|whatsapp)$')
      then 'social'
    when x.m = 'organic'
      or x.h ~ '^google\.[a-z.]{2,6}$'
      or x.h ~ '(^|\.)(bing\.com|duckduckgo\.com|search\.yahoo\.com|baidu\.com|ecosia\.org|search\.brave\.com|startpage\.com|kagi\.com|qwant\.com|search\.naver\.com)$'
      or x.h ~ '^yandex\.[a-z.]{2,6}$'
      or x.h = 'com.google.android.googlequicksearchbox'
      then 'search'
    when x.m = 'referral' or x.h <> '' then 'referral'
    when x.s <> '' or x.m <> '' then 'campaign'
    else 'direct'
  end
  from (
    select lower(coalesce(p_ref_host, '')) as h,
           lower(coalesce(p_utm_source, '')) as s,
           lower(coalesce(p_utm_medium, '')) as m
  ) x
$$;

-- app_overview() as in migration 0008, plus three keys:
--   channels:  one row per channel with any activity in the range:
--              channel, views, unique_views, clicks, unique_clicks, signups
--   sources:   the same figures per channel + specific source (a link's
--              utm_source if it has one, else the site that sent the
--              visitor; '' when there is neither), busiest 50
--   campaigns: the same figures per utm_campaign, busiest 50
-- Everything else is unchanged.
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
           public.traffic_channel(
             e.source_known, e.ref_host, e.utm_source, e.utm_medium, e.ad_click
           ) as channel,
           -- The specific source within a channel: the link's own tag if it
           -- has one, else the site that sent the visitor.
           coalesce(nullif(e.utm_source, ''), e.ref_host, '') as origin,
           coalesce(e.utm_campaign, '') as campaign,
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
           public.traffic_channel(
             i.source_known, i.ref_host, i.utm_source, i.utm_medium, i.ad_click
           ) as channel,
           coalesce(nullif(i.utm_source, ''), i.ref_host, '') as origin,
           coalesce(i.utm_campaign, '') as campaign,
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
  ),
  ev_channel as (
    select channel,
           count(*) filter (where event_type = 'impression') as views,
           count(distinct visitor_id) filter (where event_type = 'impression')
             + count(*) filter (where event_type = 'impression' and visitor_id is null) as unique_views,
           count(*) filter (where event_type = 'click') as clicks,
           count(distinct visitor_id) filter (where event_type = 'click')
             + count(*) filter (where event_type = 'click' and visitor_id is null) as unique_clicks
      from ev
     group by channel
  ),
  ld_channel as (
    select channel, count(*) as signups from ld group by channel
  ),
  ev_origin as (
    select channel, origin,
           count(*) filter (where event_type = 'impression') as views,
           count(distinct visitor_id) filter (where event_type = 'impression')
             + count(*) filter (where event_type = 'impression' and visitor_id is null) as unique_views,
           count(*) filter (where event_type = 'click') as clicks,
           count(distinct visitor_id) filter (where event_type = 'click')
             + count(*) filter (where event_type = 'click' and visitor_id is null) as unique_clicks
      from ev
     where channel <> 'unknown'
     group by channel, origin
  ),
  ld_origin as (
    select channel, origin, count(*) as signups
      from ld
     where channel <> 'unknown'
     group by channel, origin
  ),
  ev_campaign as (
    select campaign,
           count(*) filter (where event_type = 'impression') as views,
           count(distinct visitor_id) filter (where event_type = 'impression')
             + count(*) filter (where event_type = 'impression' and visitor_id is null) as unique_views,
           count(*) filter (where event_type = 'click') as clicks,
           count(distinct visitor_id) filter (where event_type = 'click')
             + count(*) filter (where event_type = 'click' and visitor_id is null) as unique_clicks
      from ev
     where campaign <> ''
     group by campaign
  ),
  ld_campaign as (
    select campaign, count(*) as signups
      from ld
     where campaign <> ''
     group by campaign
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
    ),
    'channels', (
      select coalesce(jsonb_agg(to_jsonb(c)), '[]'::jsonb)
        from (
          select channel,
                 coalesce(g.views, 0) as views,
                 coalesce(g.unique_views, 0) as unique_views,
                 coalesce(g.clicks, 0) as clicks,
                 coalesce(g.unique_clicks, 0) as unique_clicks,
                 coalesce(l.signups, 0) as signups
            from ev_channel g
            full join ld_channel l using (channel)
        ) c
    ),
    'sources', (
      select coalesce(jsonb_agg(to_jsonb(s)), '[]'::jsonb)
        from (
          select channel,
                 origin as source,
                 coalesce(g.views, 0) as views,
                 coalesce(g.unique_views, 0) as unique_views,
                 coalesce(g.clicks, 0) as clicks,
                 coalesce(g.unique_clicks, 0) as unique_clicks,
                 coalesce(l.signups, 0) as signups
            from ev_origin g
            full join ld_origin l using (channel, origin)
           order by 4 desc, 6 desc, 7 desc
           limit 50
        ) s
    ),
    'campaigns', (
      select coalesce(jsonb_agg(to_jsonb(c)), '[]'::jsonb)
        from (
          select campaign,
                 coalesce(g.views, 0) as views,
                 coalesce(g.unique_views, 0) as unique_views,
                 coalesce(g.clicks, 0) as clicks,
                 coalesce(g.unique_clicks, 0) as unique_clicks,
                 coalesce(l.signups, 0) as signups
            from ev_campaign g
            full join ld_campaign l using (campaign)
           order by 3 desc, 5 desc, 6 desc
           limit 50
        ) c
    )
  );
$$;

revoke all on function public.app_overview(date, date, text) from public, anon;
grant execute on function public.app_overview(date, date, text) to authenticated;
