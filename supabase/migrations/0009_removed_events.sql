-- 0009: a place to put events that should not have been counted, and the
-- automated clicks found on 2026-10-05
-- Safe to apply before the code that goes with it ships: it adds a table
-- nothing reads, and the move at the end only touches rows that match a bot.

-- Events taken out of app_events because they were not a person. They are
-- moved here, not destroyed, so the numbers are clean and the evidence is
-- still there if the same visitor needs studying later. Nothing in the app
-- reads or writes this table. It has no policies and no grants to the
-- browser-facing roles, so it can only be reached from the SQL editor.
create table if not exists public.app_events_removed (
  like public.app_events including defaults including constraints,
  removed_at timestamptz not null default now(),
  removed_reason text not null,
  primary key (id)
);

alter table public.app_events_removed enable row level security;
revoke all on public.app_events_removed from anon, authenticated;

-- The clicks recorded up to 2026-10-05 from an automated visitor: one every
-- ten minutes or so, across 20 apps, always with the same browser string (the
-- stock one automation tools use to pose as an iPhone), and never with a
-- visitor ID or a referring page. Each had been counted as a separate person.
-- /go no longer records requests like these (see lib/bots.ts); this clears
-- the ones stored before that. All three conditions are required, so a real
-- click (which carries this site as its referring page) cannot match.
with moved as (
  delete from public.app_events
   where event_type = 'click'
     and visitor_id is null
     and coalesce(referrer, '') = ''
     and user_agent = 'Mozilla/5.0 (iPhone; CPU iPhone OS 13_2_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.0.3 Mobile/15E148 Safari/604.1'
  returning *
)
insert into public.app_events_removed
select moved.*,
       now(),
       'Automated visitor: emulated-iPhone browser string, no visitor ID, no referring page'
  from moved;
