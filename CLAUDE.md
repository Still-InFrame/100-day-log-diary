# CLAUDE.md

Session-continuity doc. Auto-loaded as project instructions at session start. Re-read at session start; propose appends to Project status / Changelog / Gotchas / Open threads when triggers fire (see Maintenance triggers below). No secrets in this file.

AGENTS.md sits alongside this file and is auto-imported by some tooling. Treat its content as authoritative for framework-level rules and reflect anything load-bearing here under Gotchas.

## Project

100 Day Log Diary. Personal accountability tracker built as Day 1 of Savion's 100 Day AI Build Challenge (one new app per day for 100 consecutive days). Single user (Savion). The tracker logs each day's app and renders progress, streaks, stats, and milestone badges so the full 100-day picture is visible at the end. Eventually intended to also be hosted publicly as an accountability artifact.

- Stack: Next.js 16 (App Router, Turbopack) + React 19 + TypeScript + Tailwind v4 + Supabase (hosted Postgres + Auth + Storage) + recharts + canvas-confetti
- Dev: `npm run dev` (http://localhost:3000)
- Build: `npm run build`
- Type-check: `npx tsc --noEmit`
- Lint: `npm run lint`
- Kill: Ctrl+C in the dev terminal
- Logs: stdout of `npm run dev`
- Data sources: hosted Supabase project (Postgres + Auth + Storage). Connection via `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in `.env.local`.
- Not a git repo. Don't run `git init` or any git commands until Savion asks.

## Working agreements

- Communication: verbose. Walk through reasoning before/after meaningful actions. Show what options were considered. Default to one or two sentences of explanation, more when novel or risky.
- Decisions with real tradeoffs: present 2–3 options, mark one Recommended, wait for Savion. Use AskUserQuestion. Don't pick silently.
- Engineering honesty: push back when something is off. Call out scope creep, over-engineering, premature abstraction, ideas that will hurt later. Don't sugarcoat. Saying "this will cost you on Day 47" is welcome.
- Don't proactively commit, init, or push to git. The project is not a repo today. Wait for Savion to ask. Never amend, never force-push.
- Diagnose root cause before patching. Don't paper over symptoms.
- Comments: WHY, not WHAT. No emoji in code or docs (app UI emoji like badge glyphs are fine — they're product, not author voice).
- Match scope of action to scope of request. Don't add features beyond what was asked.
- Savion picked the ambitious path on Day 1 (Full MVP) — that was the right call once because Day 1 is special. Default later days to lighter scope unless he asks for max.
- Savion prefers SQL/Postgres for long-term scalability. Don't suggest swapping the DB.
- REMINDER OWED: if `profiles.challenge_start_date` ever changes (manually via SQL, or via a future settings panel), surface this proactively: "Existing entries kept their original `day_number` — they may now disagree with the live-computed day on the dashboard. Want me to recompute and update them?" Savion asked to be reminded of this.

## Maintenance triggers

Read this section every session. Propose updates to the file when ANY of these triggers fire. Don't wait to be asked.

PROJECT STATUS triggers — propose an update when:
- Non-trivial work starts → "Add to In flight?"
- Work completes → "Move from In flight to Recently shipped + Changelog?"
- User says "park this" / "come back later" → "Move to Parked?"
- External blocker discovered → "Mark Blocked with reason?"
- A Parked item gets picked back up → "Move back to In flight?"

SESSION-START RULE: re-read Project status before the first user message. If any item is In flight, surface it in one sentence: "Last session you were mid-way on [item] — pick that back up, or new direction?" Don't assume continuation; ask.

CHANGELOG trigger — propose an entry when:
- A feature shipped (new user-visible capability or integration)
- A bug fix took >15 min of investigation
- An architectural decision got made (chose A over B)
- A schema or contract changed
- A behavior change affects existing flows
- Any change spans multiple files or concerns

GOTCHA trigger — propose an entry when:
- A bug's root cause was a non-obvious framework/API/library quirk
- A constraint isn't in official docs but bit us
- A race condition or timing bug got identified
- A TypeScript or build edge case showed up
- "Future-me would re-introduce this bug without a note" — that's the test

OPEN THREAD trigger — propose an entry when:
- A temporary workaround replaced a real fix
- A known limitation deserves tracking
- An active investigation has no resolution yet
(Different from Project status: Open threads are KNOWN PARTIAL STATES that are caveats around existing systems. Project status is WORK IN MOTION on planned features/fixes.)

WORKING AGREEMENT trigger — update when:
- User corrects the same thing twice
- User says "from now on, do X this way"
- User shows frustration about a repeated pattern
- User explicitly says "remember this"

ARCHITECTURE / KEY FILES trigger — update when:
- A new top-level module or routing/state/data-flow pattern landed
- A file moved or got renamed
- A concept got relocated between files

CONVERSATIONAL CUES — phrases that mean propose an entry:
- "This was tricky" / "I always forget this" → Gotcha
- "Remember this for next time" → Gotcha or Working agreement
- "Let me come back to this" / "park it" → Project status / Parked
- "I'm stuck on X" / "blocked by Y" → Project status / Blocked
- User re-asks a question you should already know → missing entry
- "We tried X and it didn't work" → Gotcha (what didn't work AND why)

PROACTIVITY RULE: after each meaningful unit of work, scan back. If any trigger fired, surface the proposal in one sentence. User can decline; ask anyway.

NEGATIVE RULE — don't pad: typos, single-line tweaks with obvious meaning, pure whitespace changes, and reverts of just-tried things do NOT belong in the file. The bar is "would future-cold-me benefit?"

## Project status

Current state of work. Re-read at session start; surface In flight items proactively. Update when a status trigger fires.

### In flight

- **HighLevel token refresh not yet observed** — everything else in the HighLevel integration was confirmed against the real service on 2026-10-04 (see Recently shipped). The one path that has never run for real is the refresh: Savion's first access token expires 2026-10-06 00:21 UTC, and the refresh happens on the first signup or admin action after that. Check: `select needs_reconnect, last_error, access_token_expires_at from ghl_connections` — a later expiry with `needs_reconnect = false` means it worked. If Settings shows "Needs reconnecting", read `last_error` first.
- **Requested 2026-10-05, not started** (each has an open decision; ask before building):
  - Unique views: count a person once per app. Plan offered: a random ID in the visitor's browser sent with views and clicks, "Unique views"/unique clicks in Admin → Clicks. Open: whether the ranking should switch to people (10 people clicked, 50 people saw) instead of raw counts.
  - Overview dashboard with charts. Savion asked for chart.js; `recharts` is already installed and used on `/stats`. Open: which library.
  - Leads grouped by app, with a way to text or email everyone in a group at once. Open: build bulk sending in this app, or tag contacts per app in HighLevel and use its own bulk tools (which handle unsubscribes and sending limits). Bulk email is a new HighLevel call that has never been run. Only leads who agreed to texts may be texted.
- **Confirm the signup fix on a phone.** After the 2026-10-05 fix is deployed, Savion should sign up from his phone again and check Admin → Interest: "In HighLevel" means autofill no longer touches the hidden field; "Held back for review" means it still does (see Open threads).
- **Waiting on real traffic to rank apps.** Phase 3 is deployed (see Recently shipped). Nothing appears in "Most popular" until an app has 10 clicks and 50 views from the shuffled list; at deploy there were 9 clicks across 8 apps and no views recorded yet. Nothing to build here: check Admin → Clicks once there has been traffic, and confirm the page looks right, since nobody has seen that admin page in a browser.

### Blocked

(none)

### Parked

- **Reminder notifications (email or browser)** — parked 2026-06-01 per Day 1 plan. Reason: needs hosted infra (email service like Resend, or service-worker push). Now unblocked since the app is deployed. Pick back up when: Savion misses a day and wants automated nudges.
- **Streak "grace day" mechanic** — parked 2026-06-01. Reason: discussed during planning but not built. Current rule is strict — miss a day, streak resets. Pick back up when: Savion misses a day and the strict reset feels bad.
- **Per-user timezone settings panel** — parked 2026-06-01. Reason: timezone is hardcoded to `America/New_York` in [lib/constants.ts](lib/constants.ts) (`DEFAULT_TIMEZONE`). Building a real settings UI (schema column on `profiles`, edit form, server action) is 30–60 min for a feature Savion would use maybe twice a year. Pick back up when: Savion travels for an extended period and the hardcoded timezone causes a real day-shift bug.

### Recently shipped

- **Public page rebuilt around the apps** — shipped 2026-10-05. Compact app cards in a grid (extra detail behind a "Details" toggle), one slim banner in place of the banner + progress bar + stat cards for a finished challenge, badges as a single row, a one-line prompt for visitors, and no mood stars on public cards. Desktop went from about 1.2 to 8.8 apps per screen, phone from about 2 to 4.8. Local dev no longer records clicks or views. See the second 2026-10-05 Changelog entry.
- **Lead-magnet Phase 3: view tracking, shuffled order, "Most popular" row** — shipped 2026-10-05. Public pages now show the apps in a different order per visitor (stable for that visitor for the day), count which cards were actually seen, and show the top 3 apps by click rate above the list once they clear the bar. Each card still shows its day number and build date. Admin → Clicks shows views, clicks, click rate, signups and each app's ranking status. See the 2026-10-05 Changelog entry.
- **Multi-user lead capture + HighLevel via OAuth** — shipped 2026-10-04. Replaces the token design and the owner-only admin from Phase 2 below (same day, before either was ever used). Every account with a public page now has tracked links (`/go/<handle>/<day>`), the "Notify me" form, and its own `/admin` showing only its own leads and clicks. HighLevel is optional per user: Settings has a Connect HighLevel button; without a connection, signups are still saved and shown, marked "Not sent to HighLevel". The apex still shows Savion's projects. Confirmed by Savion on the live site the same day: Connect HighLevel, Send test contact, a real signup that reached HighLevel on its own 1.1 seconds after submit (status "In HighLevel", note naming the app), and a text sent from the admin. Not yet observed: the token refresh (see In flight).
- **Lead-magnet Phase 2: per-app waitlist, HighLevel sync, owner admin** — shipped 2026-10-04. Every public card has a "Notify me when this launches" form (first name, email, optional phone, SMS-consent checkbox shown once a phone is typed). Signups land in `app_interest`; if HighLevel is configured they are pushed as a contact with a note naming the app. Owner-only `/admin`: Interest (per-app signup counts, lead list, retry sync, send text, open in HighLevel), Clicks (per-app ranking), Settings (connection status + test button). Decisions Savion made: no front-door email gate; token held as a server-only env var, not pasted into a UI field; texting is a send action plus a link out to HighLevel, not an in-app two-way inbox. Verified locally: signup, validation, consent record, duplicate guard, RLS from the anon/owner/other-user sides, bot filter. NOT verified: anything that calls HighLevel, and the admin pages in a browser (see In flight).
- **Lead-magnet Phase 1: public front door + click tracking** — shipped 2026-10-04. The apex `/` now shows Savion's projects to anonymous visitors (logged-in owner still gets the dashboard); header CTA for anon is "Create your own challenge" → `/login`. Every public app link goes through `/go/<day>?t=live|code`, which records a row in `app_events` and 302s to the destination resolved from the DB. `entries` gained `live_url`; `repo_url` is now nullable; 60 non-GitHub links were moved to `live_url`, 40 GitHub links stayed in `repo_url`. Entry form has both link fields and requires at least one. Follow-up: no UI for the click data until the Phase 2 admin lands.
- **Challenge-complete celebration banner** — shipped 2026-09-10. Savion reached Day 100 (challenge complete). When all 100 days are logged (`streak.totalLogged >= TOTAL_DAYS`), a gradient `CompletionBanner` (trophy chip, "100 days. 100 apps. Done.", start→end date range, one-time session-guarded confetti) replaces the daily "log today" card on the dashboard and sits above the metric cards on `/profile` and `/share/[handle]`. Verified against live `/share/savion` data in light + dark. Follow-up resolved 2026-10-04: the "Current streak" card now reads "Complete ✓" for a finished challenge (see Open threads).
- **Deployed to Vercel + custom domain live** — shipped 2026-06-02. App live at **https://100dayaichallenge.com** (and `https://100-day-log.vercel.app`). git initialized (first commit `d9e30c1`), deployed via Vercel CLI (no GitHub repo yet — direct CLI deploy). Vercel project `still-inframes-projects/100-day-log`. Env vars set in Vercel for production/preview/development. Domain registered at GoDaddy, nameservers pointed to Vercel (`ns1/ns2.vercel-dns.com`) — Vercel manages DNS + auto-SSL for apex + www. Google login verified working on the live vercel.app domain; custom-domain serving + SSL + public share page all verified via curl. `www → apex` 308 redirect configured. Code pushed to GitHub (`Still-InFrame/100-day-log-diary`) for backup, and the repo is connected to Vercel — push to `main` auto-deploys (verified). Follow-up: none.
- **Public share page `/share/[handle]`** — shipped 2026-06-02. Read-only public view of a user's progress (header, day/100 progress, streak, all entries chronologically, trophy case). Handle set/cleared via a Share card on `/profile`. Verified anonymous read works via `curl` with no cookies (profiles + entries RLS public policies grant anon access). Savion chose FULL transparency — every entry field including mood + challenges/blockers is public. Live at `/share/savion`. Follow-up: only becomes externally useful once deployed (Vercel still parked).
- **Day 1 went live end-to-end** — shipped 2026-06-02. Hosted Supabase project `znhsntsutcbxjpadxzlt` created, migration run, Google OAuth (project "100 Day AI Challenge", test user `savion@stillinframe.com`) wired, full flow verified: login → save entry → view entry, all 200s, no RLS errors. Corrected `challenge_start_date` to 2026-06-01 (Savion considers the build day, June 1, as Day 1) and re-dated the Log Diary entry to June 1 = Day 1; today (June 2) is now Day 2. Follow-up: none.
- **Day 1 MVP — 100 Day Log Diary** — shipped 2026-06-01. Full P0+P1 of the planned scope: dashboard with day/streak/progress, entry form with required + optional fields + screenshot upload, list + detail + edit + delete, stats page (totals + tech histogram + 100-day calendar heatmap + mood trend), badge logic with confetti, trophy case, Google OAuth. Builds clean.
- **Timezone fix + next/image migration** — shipped 2026-06-01. `todayISO()` now computes today in `America/New_York` via `Intl.DateTimeFormat.formatToParts` (no new deps). All three raw `<img>` tags (screenshot preview, screenshot detail, profile avatar) switched to `next/image`; existing `remotePatterns` config already covered both hosts. Build clean. Follow-up: none.

## Changelog

Append entries when triggers fire. Each entry: date, brief title, root cause / motivation, plumbing list, tradeoffs noted. Reading cold, future-me must understand WHY this decision was made.

- **2026-06-01**: Day 1 MVP scaffolded, built, and verified.
  Root cause / motivation: Day 1 of Savion's 100 Day AI Build Challenge. Built the tracker first so it can be used every day for the remaining 99 days — strongest possible dogfooding loop. Single ambitious scope rather than splitting across multiple days.
  Plumbing:
  - app/* — 8 routes (`/`, `/log`, `/entries`, `/entries/[day]`, `/login`, `/profile`, `/stats`, `/auth/callback`)
  - components/* — 14 components incl. EntryForm with Supabase Storage upload, ConfettiBurst, CalendarHeatmap, TechHistogram, MoodTrend, TrophyCase
  - lib/* — Supabase server/client/middleware factories, queries, dates, streaks (current + longest + missed), badge computation
  - supabase/migrations/0001_initial.sql — profiles + entries + badges tables, RLS scoped to `auth.uid()`, public-read carveout gated on `profiles.public_handle`, `screenshots` Storage bucket with per-user write policy, auto-create-profile trigger on `auth.users` insert
  - SETUP.md — user-facing 5-step setup (Supabase project, env vars, migration, Google OAuth, dev run, deployment notes)
  - proxy.ts — Next 16 proxy (renamed from middleware) refreshes Supabase session and redirects unauthenticated users to /login (except `/auth/*` and `/share/*`)
  - next.config.ts — set `turbopack.root: __dirname` to silence multi-lockfile warning; added `images.remotePatterns` for Supabase storage + Google avatars
  Tradeoffs / known caveats:
  - Chose hosted Supabase from Day 1 over local Docker — simpler OAuth wiring (one redirect URL config), deploy-ready, but truly-offline dev impossible.
  - Chose Google OAuth Day 1 over no-auth or magic link — extra Google Cloud setup today but matches end-state (no auth migration later).
  - Day 1 scope ate the full session. Parked items (public share page, deploy, reminders, grace-day) are deferred to later challenge days.
  - Three "task-tracker reminder" system messages fired during the session — task tools were being used, the reminders were noise. No action needed.

- **2026-06-02**: Deployed to Vercel + custom domain; fixed `missedDays` off-by-one.
  Root cause / motivation: Savion wanted the app online same-day. Also, the public share page surfaced a streak bug: `computeStreaks` counted the current in-progress day as "missed" the moment it wasn't yet logged, so a fresh Day 2 with Day 1 logged showed "Days missed: 1" (should be 0) — demotivating, and now public.
  Plumbing:
  - git — initialized repo (`git init -b main`), first commit `d9e30c1`. Added `tsconfig.tsbuildinfo`, `.claude/settings.local.json`, `.vercel` to .gitignore. NOT pushed to GitHub yet (direct CLI deploy).
  - lib/streaks.ts — `missedDays` now uses `countableDays = loggedToday ? elapsed : elapsed - 1` so today-in-progress isn't counted as missed until the day ends.
  - Vercel — project `still-inframes-projects/100-day-log`; env vars `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` set for all 3 environments; deployed with `vercel --prod`.
  - Supabase Auth → URL Configuration — Site URL set to `https://100dayaichallenge.com`; redirect URLs added for localhost, the vercel.app domain, and the custom domain (all `/**`).
  - DNS — GoDaddy registrar, nameservers repointed to `ns1/ns2.vercel-dns.com`; Vercel auto-manages DNS + SSL for apex + www.
  Tradeoffs / known caveats: deploy is via Vercel CLI from local, NOT GitHub — so no auto-deploy on push; each deploy is a manual `vercel --prod`. Env vars now live in TWO places (`.env.local` for dev, Vercel project settings for prod) — if the Supabase key rotates, update both. `www` currently serves the app directly rather than redirecting to apex (cosmetic). No Google Cloud change was needed for the custom domain (Google's redirect URI is the Supabase callback, which is domain-independent).

- **2026-06-02**: Built public share page `/share/[handle]` (first stretch goal).
  Root cause / motivation: Savion wanted to start the parked stretch goals same-day. Chose the public share page first — backend RLS was already prepped, and it's the "external accountability artifact" from the original plan. Savion chose FULL transparency (all entry fields public, including mood + challenges) over a build-log-only subset.
  Plumbing:
  - app/share/[handle]/page.tsx — public read-only page; `getProfileByHandle` → notFound() if unclaimed; renders ProgressBar + StreakBanner + TrophyCase + entries (chronological, Day 1→latest) via PublicEntryCard; has generateMetadata for share title/description; links nowhere into the authed app
  - components/PublicEntryCard.tsx — read-only full entry render (all fields)
  - components/ShareSettings.tsx — client card on /profile to set/clear public_handle + copy link
  - app/actions/profile.ts — `setPublicHandle` server action; validates handle (`^[a-z0-9](?:[a-z0-9-]{1,28}[a-z0-9])$`), pre-checks uniqueness, catches 23505 unique-violation race
  - lib/queries.ts — added `getProfileByHandle`
  - app/profile/page.tsx — mounted ShareSettings between stats and trophy case
  Tradeoffs / known caveats: anon read confirmed via `curl` (no cookies) — profiles + entries RLS public policies work for the anonymous role, including the EXISTS-subquery in `entries_select_public`. The page renders ALL entry fields publicly per Savion's choice; if he later wants to hide mood/challenges, it's a render-level filter in the share page + PublicEntryCard. Page only matters externally once deployed (Vercel parked). At 100 entries the single-page vertical list will be long — fine for now, paginate later if needed.

- **2026-06-02**: Day 1 went live; fixed start-date drift, double-submit, hydration warning.
  Root cause / motivation: ran the full SETUP.md walkthrough live (Supabase project, migration, Google OAuth). During verification three things surfaced. (1) `challenge_start_date` was auto-set to June 2 (the day Savion signed in) but Savion's real Day 1 was June 1 (build day) — exactly the drift caveat we'd flagged. (2) The entry form fired `saveEntry` twice on a single submit (dev-mode artifact; harmless due to unique constraint but flashes a confusing duplicate-key error on new entries). (3) A one-time hydration warning on `<html>` from a browser extension.
  Plumbing:
  - SQL (run in Supabase SQL editor, not in repo): `update profiles set challenge_start_date = '2026-06-01'` + `update entries set date = '2026-06-01', day_number = 1 where date = '2026-06-02'` — honored the REMINDER OWED by recomputing the affected entry's day_number alongside the start-date change.
  - components/EntryForm.tsx — added `submittingRef` idempotency lock in `handleSubmit`; resets only on failed save (success navigates away).
  - app/layout.tsx — added `suppressHydrationWarning` to `<html>` (scoped to that element only).
  Tradeoffs / known caveats: the start-date fix was manual SQL because there is still no profile-edit UI. Double-submit root cause not definitively isolated (likely React Strict Mode in dev or fast double-click) — the lock makes the cause moot. `suppressHydrationWarning` on `<html>` will also hide a genuine top-level attribute mismatch if one is ever introduced in our own code; acceptable because our `<html>` className is fully static.

- **2026-06-01**: Switched from anon key to Supabase Publishable key.
  Root cause / motivation: Savion noticed Supabase has deprecated the anon public key in favor of "Publishable keys" (format `sb_publishable_...`). The replacement is functionally identical for client-side use but the env var name `ANON_KEY` would be misleading.
  Plumbing:
  - .env.local, .env.local.example — renamed `NEXT_PUBLIC_SUPABASE_ANON_KEY` → `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`; populated with real value
  - lib/supabase/client.ts, lib/supabase/server.ts, lib/supabase/middleware.ts — updated to read the new env var name
  - SETUP.md — instructions updated to point users to the Publishable key
  - CLAUDE.md — added Gotcha entry so future-me doesn't go hunting for the legacy anon key UI
  Tradeoffs / known caveats: this is a one-way rename; old tutorials online still reference `NEXT_PUBLIC_SUPABASE_ANON_KEY`, so if Savion copies code from elsewhere it may need adjusting.

- **2026-06-01**: Timezone hardcoded to America/New_York; `<img>` tags migrated to `next/image`.
  Root cause / motivation: Savion is in Miami (Eastern). Day 1 code computed "today" via browser local time, so a deploy from a UTC server would have day-shifted entries by 4–5 hours. Also, the three raw `<img>` tags were inconsistent with the `next.config.ts` `images.remotePatterns` config already in place.
  Plumbing:
  - lib/constants.ts — added `DEFAULT_TIMEZONE = "America/New_York"`
  - lib/dates.ts — `todayISO(timeZone?)` now takes optional IANA TZ, defaults to `DEFAULT_TIMEZONE`, uses `Intl.DateTimeFormat.formatToParts` for cross-runtime stability
  - components/EntryForm.tsx, app/entries/[day]/page.tsx, app/profile/page.tsx — `<img>` → `<Image>` with explicit width/height + `sizes` for screenshots, fixed 64×64 for avatar
  Tradeoffs / known caveats: parked the per-user timezone settings panel (see Parked). Avatar Image uses fixed 64×64 — if profile UI ever resizes, both Image dimensions and className need to change together. Screenshots use large hint dimensions (1200×800 / 1600×1000) + `h-auto w-full` so natural aspect ratio is preserved.

- **2026-09-10**: Challenge-complete celebration banner.
  Root cause / motivation: Savion hit Day 100 — the challenge is over, so the daily "you haven't logged today" prompt was both stale (kept showing "Day 100 — lock it in" because today is past the last log date) and tonally wrong. Wanted a celebratory end-state instead.
  Plumbing:
  - components/CompletionBanner.tsx — new client component; vivid indigo→purple→pink gradient, trophy chip, "N days. N apps. Done.", computes the Day 100 date as `startDate + (TOTAL_DAYS - 1)` via date-fns `format` (NOT `toISOString`, which would UTC-shift the day), one-time confetti guarded by a `sessionStorage` key so it fires once per browser session rather than on every navigation.
  - app/page.tsx — `complete = streak.totalLogged >= TOTAL_DAYS`; banner at top when complete; the daily log-status card is hidden when complete.
  - app/profile/page.tsx, app/share/[handle]/page.tsx — same `complete` gate; banner mounted above the metric-card row.
  Tradeoffs / known caveats: completion is defined purely as 100 distinct days logged — zero-miss by construction, since `day_number` is unique 1..100 — so no new schema/flag. Banner added to authed `/profile` too (not just the public share page) for consistency. "Current streak" still computes live and reads 0 once the challenge ends; left as-is pending Savion's call (see Open threads). Pre-existing unrelated lint error surfaced during this work (`Date.now()` in render at EntryForm.tsx:105, `react-hooks/purity`) — not fixed here; `next build` does not run ESLint so it does not block deploys.

- **2026-10-04**: Lead-magnet Phase 1 — apex shows the owner's projects; outbound clicks tracked.
  Root cause / motivation: the challenge is finished and Savion wants the site to work as a lead magnet that tells him which of the 100 apps draws the most interest, so he can pick a top three to push. Two blockers existed: the apex redirected strangers to a Google login, and each entry had a single link field (`repo_url`) holding either a GitHub repo or a live app. Savion chose anonymous telemetry over a front-door email gate (a gate cuts volume and biases the sample; it captures people, not product signal).
  Plumbing:
  - supabase/migrations/0002_telemetry_and_live_url.sql — `entries.live_url` added; `entries.repo_url` NOT NULL dropped; backfill moved non-GitHub links to `live_url` (40 GitHub / 60 live / 0 neither, verified); `app_events` table with anon+authenticated insert-only policy and owner-only select.
  - app/go/[day]/route.ts — tracked redirect. Destination comes from the DB only (a `?to=` param is ignored, so no open redirect); falls back to the other link if the requested one is empty; logging is best-effort and never blocks the redirect.
  - components/Showcase.tsx — shared public view, used by `/` (anon) and `/share/[handle]`.
  - app/page.tsx — anon branch renders `Showcase` for `OWNER_HANDLE`; authed branch is the dashboard as before.
  - lib/supabase/middleware.ts — anon allowed on `/` and `/go/*`.
  - components/PublicEntryCard.tsx — "Open app" / "View code" buttons through `/go`.
  - components/Nav.tsx — anon CTA is "Create your own challenge".
  - components/EntryForm.tsx, app/actions/entries.ts, lib/types.ts — `live_url` field; at least one link required.
  - app/entries/[day]/page.tsx — owner's detail view links directly (not via `/go`) so the owner's own clicks are not counted as interest.
  - components/CompletionBanner.tsx — optional `name` prop so public pages say "Savion Smith shipped…" instead of "You shipped…".
  - lib/constants.ts — `OWNER_HANDLE`.
  Tradeoffs / known caveats: the migration was applied to production BEFORE the code was deployed, which left 60 live-app links dead on the live site until the deploy (see Gotchas). Click inserts are unauthenticated, so bots and crawlers can inflate counts (see Open threads). `/go` and the showcase assume a single owner.

- **2026-10-04**: Lead-magnet Phase 2 — per-app waitlist, HighLevel sync, owner admin.
  Root cause / motivation: clicks show breadth of interest; a signup tied to one specific app is the stronger viability signal and also builds a list Savion can text. He wanted leads in HighLevel automatically (app name in the notes), a backend view of interest, and a way to text leads.
  Plumbing:
  - supabase/migrations/0003_app_interest.sql — `app_interest` (lead + consent record + sync bookkeeping), unique on (owner, lower(email), day); anon insert-only limited to the initial unsynced state; owner-only select/update/delete; `record_interest_sync()` SECURITY DEFINER; `app_click_stats()` / `app_interest_stats()` SECURITY INVOKER, granted to authenticated only.
  - lib/ghl.ts — HighLevel client: upsert contact, add note, send SMS, contact link. Reads `GHL_PRIVATE_TOKEN`, `GHL_LOCATION_ID`, optional `GHL_APP_BASE_URL`.
  - lib/owner.ts — `getOwner` / `requireOwner` / `isOwnerUser`: owner = the account holding `OWNER_HANDLE`.
  - app/actions/interest.ts — `submitInterest` (public) and owner-only `retryLeadSync`, `sendLeadText`, `sendTestContact`.
  - components/NotifyMeForm.tsx + components/PublicEntryCard.tsx — the form on each card; tracked links gained `rel="nofollow"`.
  - app/admin/{layout,page,clicks/page,settings/page}.tsx, components/admin/* — the admin.
  - app/go/[day]/route.ts — known crawler user-agents are redirected but not counted. app/robots.ts — disallows `/go/`, `/admin`, `/login`, `/auth/`; middleware lets `/robots.txt` through.
  - app/actions/profile.ts — the `OWNER_HANDLE` handle can no longer be changed or cleared in the app.
  - components/Nav.tsx — "Admin" link for the owner.
  Decisions and why:
  - Token as env var, not a settings field: the sync runs inside an anonymous visitor's request, which cannot read an owner-only table row, so a DB-stored token would need a service-role key on the server anyway. An env var is one secret instead of two and never touches the database.
  - Insert first, sync after the response (`after()`): the lead is saved before any third-party call, so a HighLevel outage cannot lose it, and the visitor never waits on HighLevel. Because the anon role cannot update its own row, the outcome is written back through `record_interest_sync()`.
  - No in-app inbox: HighLevel already has one with notifications; replies would otherwise need inbound webhooks and message syncing.
  - `tags` is not sent on contact upsert because HighLevel replaces a contact's existing tags with whatever is sent.
  - HighLevel API version headers are the dated ones (`2021-07-28` contacts, `2021-04-15` conversations), matching their Private Integration guide; their reference also documents `v3`.
  - The SMS request omits the `status` field their reference marks as required: it describes delivery state, and sending it risked a text being recorded as delivered without being sent. If HighLevel rejects the request, the admin shows the reply verbatim.
  Tradeoffs / known caveats: see Open threads (spam, consent forgery, lead list cap).

- **2026-10-04**: Multi-user lead capture; HighLevel via OAuth instead of a token.
  Root cause / motivation: Savion wants other people who create an account to get the same thing he has (tracked links, signups, admin, optional HighLevel sync and texting). A Private Integration Token only ever connects one account, so the token design from earlier the same day was replaced before it was ever configured. HighLevel remains optional per user: without a connection, signups are still saved and shown in that user's admin. At the time there were 9 accounts and only Savion's had any entries.
  What changed from the Phase 2 design:
  - Owner-only admin → every signed-in user has `/admin`, showing only their own data (RLS on `owner_user_id = auth.uid()` was already per-user). `requireOwner` is gone; [lib/session.ts](lib/session.ts) `requireUser` replaces it. `OWNER_HANDLE` now only decides whose projects the apex shows.
  - Tracked links and the signup form carry the page owner's handle: `/go/<handle>/<day>`, `submitInterest({ handle, … })`. `/go/<day>` still works for the site owner.
  - `GHL_PRIVATE_TOKEN` / `GHL_LOCATION_ID` removed. New server settings: `GHL_CLIENT_ID`, `GHL_CLIENT_SECRET`, `SUPABASE_SECRET_KEY` (optional `GHL_INSTALL_URL`, `GHL_APP_BASE_URL`).
  Plumbing:
  - supabase/migrations/0004_ghl_connections.sql — `ghl_connections` (one row per user: tokens, sub-account id, expiry). RLS on with no policies and privileges revoked from anon/authenticated; `ghl_claim_refresh()` lease function, service_role only.
  - lib/supabase/admin.ts — secret-key client, used only for `ghl_connections`.
  - lib/ghl.ts — pure HTTP: install URL, code exchange, refresh, contact upsert, note, SMS. API version header is `v3`.
  - lib/ghl-connection.ts — store/read/delete a connection; `getGhlAuthFor(userId)` returns a working access token, refreshing under the lease.
  - lib/crm-oauth.ts, app/api/crm/connect/route.ts, app/api/crm/callback/route.ts — the connect flow.
  - app/go/[...parts]/route.ts — replaces app/go/[day]/route.ts.
  - app/actions/interest.ts, components/{NotifyMeForm,PublicEntryCard,Showcase}.tsx, app/admin/*, components/admin/DisconnectButton.tsx, components/Nav.tsx (Admin link for everyone signed in).
  - lib/supabase/middleware.ts — the redirect to `/login` now drops the query string.
  Decisions and why:
  - A Supabase secret key is now required for the HighLevel feature. A signup runs as an anonymous visitor, who must not be able to read the page owner's tokens, yet the server must use them. Handing tokens to the anon role through a function would let anyone who inserts a lead read them.
  - Refresh tokens are single-use, so refreshes go through a database lease (`ghl_claim_refresh`): one request refreshes, the others wait and reuse the result. Without it two simultaneous signups near expiry could store a dead token and break the connection.
  - HighLevel's guide does not say `state` is echoed back, so the callback requires a short-lived httpOnly cookie set by the connect route, and additionally checks `state` when it is present. This stops a link carrying someone else's code from attaching their HighLevel account to the signed-in user.
  - Routes are `/api/crm/*` rather than named after the vendor, so the registered redirect URL has no vendor name in it.
  - Messages from the connect flow reach Settings through a short-lived cookie, not the URL, so HighLevel's error replies do not sit in history or logs.
  - API version: Savion asked for the newest, so every call sends `Version: v3`. The version is a per-request header and has nothing to do with OAuth vs token.
  Verified before deploy: 40 request-shape checks against a local stand-in server; the lease function and table privileges in SQL; per-user links, redirects, route gating and a browser signup locally.
  Confirmed against the real HighLevel after deploy (2026-10-04, by Savion on the live site): the connect flow and code exchange (form-urlencoded body, `user_type=Location`); contact upsert and note with `Version: v3`; the automatic push from an anonymous visitor's signup; and an SMS sent WITHOUT the `status` field the reference marks as required, so that field is not needed for an outbound text. The stored scope came back as `contacts.write conversations/message.write`.
  Still not observed: the refresh path (first due after 2026-10-06 00:21 UTC), and whether HighLevel echoes `state`.

- **2026-10-05**: Lead-magnet Phase 3 — view tracking, shuffled order, "Most popular" row.
  Root cause / motivation: the point of the lead magnet is to learn which apps people are drawn to. Clicks alone could not answer that: with 100 tall cards in day order, the first few got nearly all the attention, so raw clicks measured position. Savion chose "shuffle, then promote", and asked that each card still show the day it was built since day order is no longer the point of the page.
  Plumbing:
  - supabase/migrations/0005_views_and_popular.sql — `app_events.source` (`list` | `popular`); `event_type` now also `impression`; index on (owner, type, day); `app_engagement_stats()` (owner-only, SECURITY INVOKER); `popular_apps(owner)` (public, SECURITY DEFINER, returns day numbers only).
  - components/ViewTracker.tsx — IntersectionObserver on `[data-app-day]`; a card is seen once 60% of its heading block has been on screen for 1 second in a visible tab; once per page load; batched to `/api/views` every 3s and on page hide (`sendBeacon`).
  - app/api/views/route.ts — stores impressions as the anon role; always answers 204. middleware lets anon reach it.
  - lib/shuffle.ts — seeded shuffle; the seed is a hash of the visitor's address + browser string + date + page, so the order is stable per visitor per day and nothing is stored.
  - components/Showcase.tsx — now async: shuffled list, `PopularApps` row above it, `ViewTracker` unless the viewer owns the page. Heading is "All N apps".
  - components/PopularApps.tsx — top 3 cards; links carry `&p=1`.
  - components/PublicEntryCard.tsx — heading block marked `data-app-day`.
  - app/go/[...parts]/route.ts — `p=1` → `source = popular`; a signed-in owner's clicks on their own page are no longer recorded. lib/bots.ts — the crawler filter, shared by `/go` and `/api/views`.
  - app/admin/clicks/page.tsx — views, clicks, click rate, signups, and each app's status (Most popular #n / Ranked / what it still needs).
  Decisions and why:
  - Rank by click rate (list clicks ÷ list views), bar of 10 clicks and 50 views, top 3, signups break ties. Savion's original idea was raw clicks at 10–15; rate needs views but is not decided by position.
  - Clicks from the "Most popular" row are stored but excluded from the rate, and its cards are not counted as views. Otherwise an app would keep its place by being shown first.
  - The bar is fixed inside `popular_apps()` rather than passed in, so an anonymous caller cannot lower it to read the ordering early. `POPULAR_*` in lib/constants.ts mirror it for the admin text; change both together.
  - The heading block is observed, not the whole card: a card with a tall screenshot can be longer than the screen and would never be 60% visible.
  - Impression rows store no browser string or referrer (they are filtered before insert), to keep rows small and collect less.
  - The endpoint is named plainly (`/api/views`); it was not named to dodge ad blockers.
  Verified: ranking rules on synthetic rows in SQL (rate order, both thresholds, popular-row clicks excluded, limit 3); shuffle stable per visitor and different across visitors; the endpoint rejecting crawlers, unknown handles, junk days and malformed bodies; the tracker in a real browser counting exactly the two cards held on screen and not one scrolled past; the row rendering at desktop and phone widths. After deploy the live site recorded real views within minutes. Not verified: the admin Clicks page in a browser (needs a Google login).

- **2026-10-05**: Public page refocused on the apps (follow-ups to Phase 3).
  Root cause / motivation: Savion's words: "the focus now should be on the apps". The nine-card badge grid sat above the app list and he questioned whether badges matter any more; the mood stars beside each app read as a rating of the app when they actually record how he felt that day.
  He then asked whether the layout was the best one for app testing. Measured before the change: about 1.2 apps per screen on desktop (median card 831px tall), the first app 0.8 screens down, and 88 screens to scroll past all 100. With a 50-view bar per app, that needed far more visitors than necessary. He chose all three proposed changes.
  Plumbing:
  - components/PublicEntryCard.tsx — rewritten as a compact card: picture, day + date, name, two-line description, "Open app"/"View code" and "Notify me" on one row, everything else (tech stack, time, learnings, challenges) behind a native `<details>` toggle. The picture is also a tracked link. On phones the picture sits left of the text; from `sm` up it sits on top. Mood stars removed from public cards.
  - components/Showcase.tsx — card grid (`sm` 2 columns, `md` 3, `items-start` so an opened card does not stretch its row); a finished challenge shows one slim banner instead of banner + progress bar + four stat cards (an unfinished one keeps the progress bar and stats); a one-line prompt under the heading; badges as one row above the apps.
  - components/CompletionBanner.tsx — `compact` variant. components/BadgeStrip.tsx — earned badges as one side-scrolling row of chips (`TrophyCase` is unchanged and still used on the private `/profile`).
  - components/NotifyMeForm.tsx — button shortened to "Notify me" (full sentence in its `title` and in the form heading); fields stack in one column; the form and the confirmation take a full line of the card's action row.
  - lib/recording.ts, used by `/go` and `/api/views` — local dev no longer writes clicks or views (see Gotchas). Added because testing these very changes in a browser would otherwise have been counted as real views.
  Result, measured the same way: desktop 8.8 apps per screen, first app 0.47 screens down, 12 screens total; phone 4.8 apps per screen (22 screens). The view counter was re-checked against the new card shape by capturing what the page reports: exactly the cards at least 60% on screen.
  Tradeoffs / known caveats: with several cards on screen at once a "view" is a weaker signal than with one big card, so click rates read lower than before; the effect is the same for every app. The 10-click / 50-view bar was not changed and will now be reached sooner. The "Complete ✓" stat card no longer appears on a finished challenge's public page (it is still on the dashboard and profile).

- **2026-10-05**: A phone signup reported success but was not saved; honeypot no longer discards.
  Root cause / motivation: after the layout deploy Savion reported that a signup worked on his phone. The table showed no new row (see Gotchas for the evidence). The form's honeypot returned success and stored nothing when filled, so a real person whose browser filled the hidden field was dropped with no trace. Not proven to be autofill, but that behaviour was unsafe whatever triggered it.
  Plumbing:
  - supabase/migrations/0006_suspected_automated.sql — `app_interest.suspected_automated`.
  - app/actions/interest.ts — a filled honeypot now stores the lead with the flag set and records `skipped` with a "Held back" note instead of pushing to HighLevel. Accepts the field as `trap` (new) or `website` (old name).
  - components/NotifyMeForm.tsx — hidden field renamed to something autofill has no reason to fill (`hp_confirm`, label "Leave this field empty", autocomplete off, password-manager ignore hints).
  - app/admin/page.tsx — flagged, unsent leads show "Held back for review" with an explanation; the existing "Send to HighLevel" button sends them.
  Decisions and why: store-and-hold rather than store-and-send, so obvious bot junk still stays out of the CRM, while a real person costs one click instead of being lost. Verified locally: a signup with the hidden field filled is saved, flagged and held; a normal one is saved unflagged.

## Open threads

Known partial states + caveats in existing systems. Read before "fixing" anything in these areas. Different from Project status — these are CHRONIC NOTES on existing code, not work-in-progress.

- **`profiles.challenge_start_date` is auto-set and only editable via SQL.** Defaults to the date the user's `auth.users` row is created (via the `handle_new_user` trigger). No UI to edit. This already bit us once: Savion signed in June 2 but Day 1 was June 1, so day numbering was off by one until corrected via SQL (see 2026-06-02 changelog). Current value: `2026-06-01`. Workaround documented in SETUP.md troubleshooting. Permanent fix is a profile-edit UI (parked).
- **No magic-link / email auth fallback.** Login assumes Google OAuth is configured. If OAuth breaks, Savion cannot get in — there is no recovery path. Acceptable while single-user.
- **One entry per calendar date per user.** Schema enforces `unique (user_id, date)` AND `unique (user_id, day_number)`. Cannot log two apps for the same day (intentional). `date` is captured via `todayISO()` which uses `DEFAULT_TIMEZONE` (`America/New_York`) — see [lib/dates.ts](lib/dates.ts). If Savion travels OR the default timezone ever changes, an entry made near midnight Eastern could land on the "wrong" calendar day relative to a hostile reading. Tradeoff considered acceptable while single-user + single-timezone.
- **Badges are derived state stored as rows.** `lib/badges.ts > computeEarnedBadges()` recomputes from entries on every `saveEntry()`. Idempotent insert (unique on user_id + badge_type). If badge logic changes, existing badges are NOT retroactively removed — only new ones are added. To remove obsolete badges, manual `delete from badges` is needed.
- **Stored `day_number` can drift from live-computed day.** Each entry stores `day_number` at insert time, computed from `challenge_start_date` then. If `challenge_start_date` changes later (manually via SQL or via a future settings panel), old entries keep their original `day_number` while the dashboard's "Day X / 100" recomputes live — they will disagree. No recompute migration today. Savion asked to be reminded of this any time `challenge_start_date` changes; see Working agreements.
- **Public pages show every entry field except mood.** `/` and `/share/[handle]` render everything including `challenges` (Savion chose full transparency 2026-06-02). The mood stars were removed from public cards on 2026-10-05 because next to an app they read as a rating of the app; they remain on the owner's entry and stats pages. Mood is hidden in the page only: the row-level policies still expose the whole `entries` row, so it can be read through the API. Anyone with the handle URL — no auth — sees everything else. To hide fields later, filter in [app/share/[handle]/page.tsx](app/share/[handle]/page.tsx) + [components/PublicEntryCard.tsx](components/PublicEntryCard.tsx); the data is still protected at the row level (only public-handle owners are exposed), so it's a render-level change, not RLS. Public visibility hinges on `entries_select_public` / `badges_select_public` / `profiles_select_public` policies — verified working for the anon role 2026-06-02. If those policies change, the share page silently goes empty (renders 200 with no entries) rather than erroring.
- **Env vars live in two places now.** Dev reads `.env.local`; prod reads Vercel project settings (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, set for production/preview/development). If the Supabase publishable key ever rotates, update BOTH or prod breaks while dev works (or vice versa). `NEXT_PUBLIC_*` vars are inlined at build time, so after changing them in Vercel you must redeploy (`vercel --prod`) — a running deployment won't pick them up.
- **Docs-only pushes trigger full prod rebuilds.** GitHub↔Vercel is connected, so every push to `main` auto-builds and deploys to production — including docs-only changes (README, CLAUDE.md). Harmless but not free; add a Vercel "Ignored Build Step" later if the rebuilds become noise. Repo: `git@github.com:Still-InFrame/100-day-log-diary.git`, branch `main`, pushed over SSH key `~/.ssh/id_ed25519`.
- **Multi-lockfile environment.** A `package-lock.json` exists at `/Users/savionsmith/package-lock.json` outside this project. Turbopack initially picked that as workspace root. Fixed via `turbopack.root: __dirname`. If that config disappears, the warning returns.
- **`lucide-react` is installed but unused.** Was installed during initial dep batch in case icons were needed; never imported. Savion asked to keep for now but flag for revisit. If still unused by Day 10 of the challenge, propose `npm uninstall lucide-react`.
- **No automated tests, but smoke-testing as we build.** Savion's stated approach is to smoke test interactively in the browser during each build rather than write unit tests on Day 1. Higest-leverage candidates if/when test infra lands: `lib/streaks.ts > computeStreaks` (current/longest/missed edge cases) and `lib/badges.ts > computeEarnedBadges` (threshold + no_skip_100 logic).
- **The "Current streak" card shows "Complete ✓" once all 100 days are logged** (Savion's choice, 2026-10-04). `computeStreaks` itself is unchanged and still returns `current: 0` after the challenge ends, because it counts back from today; only the display in [components/StreakBanner.tsx](components/StreakBanner.tsx) and the Profile stat card swaps the label when `totalLogged >= TOTAL_DAYS`. Anything else that reads `streak.current` for a finished challenge will still get 0. Since the 2026-10-05 layout change a finished challenge's public page no longer renders `StreakBanner` at all, so this label is now seen only on the dashboard and profile.
- **The apex shows one account's projects.** `OWNER_HANDLE` in [lib/constants.ts](lib/constants.ts) decides whose projects `/` shows. Everything else is per-user: `/share/[handle]`, tracked links (`/go/<handle>/<day>`), signups and the admin.
- **HighLevel tokens are stored as plain text in `ghl_connections`.** They are protected by database privileges (no browser-facing role can reach the table), not by encryption. Anyone with the Supabase secret key or dashboard access can read them.
- **If a refresh succeeds but storing the new tokens fails, that connection is dead.** HighLevel has already retired the old refresh token. The next refresh is rejected, the row is marked `needs_reconnect`, and the user must press Reconnect. Logged as "refreshed but could not store tokens".
- **The connect flow's CSRF protection rests on a cookie.** See the 2026-10-04 changelog entry. If HighLevel is confirmed to echo `state`, the `state` check could be made mandatory.
- **Who can install the Marketplace app is unconfirmed.** The docs that could be read do not say whether a Private app can be installed by HighLevel accounts outside the developer's own agency. If other users cannot connect, the app probably needs a public listing; HighLevel's review asks for a demo video and a support contact.
- **The site now holds other users' leads.** Any signed-in user with a public page collects names, emails and phone numbers into this database. There is no privacy policy or terms page.
- **"Disconnect" only deletes the stored tokens.** It does not uninstall the app inside HighLevel.
- **Click and view events are unauthenticated inserts.** Anyone can write to `app_events` (RLS `with check (true)`), including fake views or clicks that would move an app's click rate. `/go` and `/api/views` skip user-agents that look automated, links are `nofollow`, and robots.txt disallows `/go/` and `/api/`, but all of that relies on the client being honest. There is no rate limit.
- **Views are undercounted for visitors who block scripts or beacons**, while their clicks still count (a click is a plain link). That pushes click rates up a little across the board; it should not change the order much.
- **`popular_apps()` re-aggregates every event for the owner on each public page load.** Fine at current volume. When `app_events` grows large, cache the result or keep a summary table.
- **`app_click_stats()` still exists in the database but nothing calls it** (replaced by `app_engagement_stats()` in 0005). It was left in place because the then-live code still used it; drop it in a later migration.
- **A visitor's shuffled order changes at midnight Eastern and differs by device or network.** By design: the seed is address + browser + date.
- **On a phone the first app still starts about two-thirds of a screen down** (header, slim banner, badge row, heading). On desktop it is under half a screen. The header's two-line title and subtitle are the next thing to trim if that matters.
- **Public page copy is in two voices.** The banner names the builder in the third person; "What I learned" inside Details is first person; the prompt under the heading is an instruction to the visitor. Deliberate, so the same page works for any user, but worth knowing before rewording.
- **The "Notify me" form is open to the public with no rate limit.** A hidden honeypot field marks simple bots: a signup that fills it is stored with `suspected_automated = true` and kept out of HighLevel until the owner sends it from the admin ("Held back for review"). It is never discarded (see Gotchas). Nothing stops a determined bot from filling the leads table with junk; add a rate limit or a challenge if spam shows up.
- **Whether phone autofill still fills the renamed honeypot is unconfirmed.** If real people keep arriving as "Held back for review", the renaming did not work on their devices: drop the honeypot or replace it with a timing check, rather than making people wait for a manual send.
- **SMS consent is single opt-in and can be entered for someone else's number.** Anyone can type another person's phone and tick the box. The consent wording and time are stored, but there is no confirmation text. HighLevel's own compliance tools (A2P registration, STOP handling) apply on send.
- **The front door belongs to whoever holds the `savion` handle.** The app refuses to change or clear that handle, but it can still be changed with SQL; doing so empties the main domain and lets whoever claims the handle next take it over. (Admin and leads are per-user and do not depend on it.)
- **Admin lead list shows the latest 200.** Counts come from SQL functions and stay correct; the list itself has no paging or search yet.
- **A lead stuck on "Sync pending" means the after-response step never finished** (for example the function was cut off). Use "Send to HighLevel" on that lead in the admin.
- **Most live-app links are `*.vibepreview.com` preview URLs.** They may expire, and the host returns 403 to non-browser requests, so link health cannot be checked by script — a curl 403 there does NOT mean the app is down (confirmed in a real browser 2026-10-04). Before pushing traffic at the top apps, move them to stable hosting.
- **`/` has only the generic site title/description.** `/share/[handle]` has `generateMetadata`; the apex showcase does not, so link previews of the main domain are generic.

## Gotchas

Things that took real time to figure out. Format: terse description + resolution. One example per distinct lesson.

- **This is NOT the Next.js you know (per AGENTS.md).** Next 16 has breaking changes from training-data Next. `middleware.ts` was renamed to `proxy.ts`, and the exported function must be named `proxy` (not `middleware`). Build will fail with "Proxy is missing expected function export name" if you forget. Read `node_modules/next/dist/docs/` for the relevant area before writing routing/middleware/turbopack code. Heed deprecation notices.
- **`create-next-app` rejects folder names with spaces/capitals.** It derives the npm package name from the folder ("name can only contain URL-friendly characters; can no longer contain capital letters"). Day 1's folder is `Day 1 - Log Diary`; worked around by scaffolding to `/tmp/log-diary-scaffold` then `cp -R` back + setting `package.json` name to `log-diary`. For Days 2–100: name folders URL-safe from the start (`day-02-<name>`) — the `new-day.sh` scaffold in the parent dir does this automatically.
- **This folder can't be renamed from inside a Claude Code session.** Tried `mv "Day 1 - Log Diary" day-01-log-diary` on 2026-06-02; it worked for a few commands, then the session restored the launch-time path (look for "Shell cwd was reset to…" notes — the session pins its working directory). The rename bounced back to `Day 1 - Log Diary`. Content + git history are intact regardless. It's cosmetic (the app is built; the name only ever mattered to `create-next-app`). To rename for tidiness, do it from a plain terminal AFTER closing the Claude session, then it sticks.
- **Supabase RLS requires the cookies-aware server client.** Use [lib/supabase/server.ts](lib/supabase/server.ts) in Server Components, Server Actions, and Route Handlers. Use [lib/supabase/client.ts](lib/supabase/client.ts) only in `"use client"` components. Calling the browser client server-side (or vice versa) silently misses the user session and queries return 0 rows with no error — looks like "no data" instead of "auth bug."
- **Screenshot upload path format is load-bearing.** Uploads go to `screenshots/{user_id}/{ts}.{ext}`. The RLS policy `screenshots_user_write` checks that the FIRST folder name equals the auth UID. Changing the upload path in [components/EntryForm.tsx](components/EntryForm.tsx) without updating the SQL policy will break uploads with a permissions error.
- **`canvas-confetti` requires the bundled types package.** `npm install canvas-confetti` alone leaves TypeScript unhappy. Install `@types/canvas-confetti` as a dev dep alongside it.
- **Supabase deprecated the legacy "anon public" key.** New projects show a Publishable key (format `sb_publishable_...`) instead. It's a drop-in replacement for the anon key in `@supabase/ssr` / `createBrowserClient` / `createServerClient` — same parameter slot, same role (client-side public identification). Env var renamed to `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` to match. Do NOT search for or use the legacy anon key UI in new projects — it's hidden/legacy.
- **Google Cloud OAuth consent screen moved to "Google Auth Platform" with tabs.** The old single-wizard "OAuth consent screen" is now split into Overview / Branding / Audience / Clients / Data Access tabs. User-type (External) and Test users live under **Audience**; the OAuth client is created under **Clients**. Adding yourself as a Test user is mandatory while the app is in "Testing" mode — skipping it causes `Error 403: access_denied` at sign-in. The Supabase redirect URI to register in Google: `https://znhsntsutcbxjpadxzlt.supabase.co/auth/v1/callback` (must match exactly or `redirect_uri_mismatch`).
- **EntryForm fired the save server action twice per submit in dev.** Single click → two `POST` + two `saveEntry` calls (seen on both create and edit). `handleSubmit` code is correct (one `startTransition`), so cause is likely React Strict Mode in dev or a fast double-click. Harmless (unique constraint blocks dupes) but flashed a duplicate-key error on new entries. Fixed with a `submittingRef` lock in [components/EntryForm.tsx](components/EntryForm.tsx). If you ever remove that ref, the double-fire returns.
- **npm global installs fail on this machine (EACCES + needs root).** `npm i -g <pkg>` fails two ways: (1) `~/.npm/_cacache` has root-owned files (EACCES on rename), (2) the global prefix `/usr/local/lib/node_modules` needs root. Don't fight it with `sudo` (needs Savion's password). Workaround that works: run CLIs via `npx --yes --cache /tmp/npm-vercel-cache <pkg>@latest <cmd>` — the `--cache` flag dodges the corrupted cache, npx dodges the global prefix. This is how the Vercel CLI is invoked (see deploy notes).
- **`$VAR` holding a multi-word command doesn't word-split in zsh.** The login shell is zsh. `PREFIX='npx ... vercel@latest'; $PREFIX whoami` fails with "no such file or directory: npx ... vercel@latest" because zsh treats `$PREFIX` as one word (unlike bash). Write the full command inline, or use `${=PREFIX}` for zsh word-splitting.
- **Vercel CLI has no command for domain redirects (www → apex).** Done via the REST API instead: `PATCH https://api.vercel.com/v9/projects/{projectId}/domains/{domain}?teamId={teamId}` with body `{"redirect":"<apex>","redirectStatusCode":308}`. Token is in `~/Library/Application Support/com.vercel.cli/auth.json` (key `token`); projectId + orgId/teamId are in `.vercel/project.json`. This is how `www.100dayaichallenge.com` was set to 308-redirect to the apex.
- **Chat transcripts live in `~/.claude/projects/`, OUTSIDE the repo — git + this CLAUDE.md are the only durable record.** Confirmed 2026-09-10: every June-2026 session transcript (the whole Day 1 build) is gone from `~/.claude/projects/` — a June-shaped hole with April/May/July/Aug/Sep intact, so it was a selective `~/.claude` loss (manual delete / partial restore / sync eviction), NOT the 30-day `cleanupPeriodDays` prune (files far older than 30 days survived) and NOT folder-rename orphaning (no other Log Diary path key exists anywhere). Nothing recoverable locally (not in Trash, no APFS local snapshots). Transcripts don't travel with `git clone` or any repo backup. Mitigation applied: set `cleanupPeriodDays: 3650` in `~/.claude/settings.json`. Takeaway: keep load-bearing decisions in git/CLAUDE.md, never only in the conversation.
- **Ship the code before a migration that removes or nulls something the live code reads.** On 2026-10-04 migration 0002 nulled `repo_url` for 60 entries while production still rendered `href={entry.repo_url}`; those links were dead on the live site until the new code deployed. Order for any non-additive schema change: (1) additive migration, (2) deploy code that tolerates both shapes, (3) the destructive step. Additive-only migrations (new table, new nullable column) are safe in either order.
- **Never name a shell variable `path` in zsh.** It is tied to `PATH`; `for path in ...` wipes the search path and every later command fails with "command not found".
- **A honeypot must never answer "success" and store nothing.** The "Notify me" form did exactly that when its hidden field (then labelled "Website") was filled. On 2026-10-05 Savion signed up from his phone, saw "You're on the list", and no row existed: both stored signups were from a Mac and none was newer than the deploy. The likely cause is contact autofill filling the hidden field; not proven, because the dropped request left no trace, which is the real lesson. Now a filled honeypot stores the lead flagged and holds it from HighLevel. When a form reports success, check that a row exists before believing it.
- **Clicks and views are NOT recorded by the local dev server.** Local development talks to the production database, and view rows carry nothing that would let test traffic be found and removed, so [lib/recording.ts](lib/recording.ts) turns recording off outside deployed builds. `/go` still redirects and `/api/views` still answers 204; they just write nothing. To test recording locally, start with `RECORD_EVENTS_IN_DEV=1 npm run dev` and delete what it writes. If "nothing is being recorded" locally, this is why.
- **A data-modifying CTE and the rest of the same SQL statement see the same snapshot.** `with d as (delete … returning id) select count(*) from the_table` still counts the deleted rows, and a function called in that statement still sees them. Check the result in a second statement.
- **Two dynamic folders with different names cannot sit at the same level.** `app/go/[day]` beside `app/go/[handle]/[day]` is rejected by Next ("different slug names for the same dynamic path"). `/go` uses one catch-all, `app/go/[...parts]/route.ts`, and branches on the number of segments.
- **Deleting or renaming a route leaves stale generated types that fail `tsc`.** `.next/types` and `.next/dev/types` keep importing the old file ("Cannot find module '../../app/…/route.js'"). Delete those two folders and rebuild; it is not a code error.
- **A `route.ts` may only export HTTP handlers and route config.** Shared constants or helpers exported from it break the build, so the connect flow's shared pieces live in `lib/crm-oauth.ts`.
- **HighLevel's docs site returns nothing to `curl`.** Pages can be read through a fetch tool but not scripted. Their API version is a `Version` request header (`v3` is current; `2021-07-28` / `2021-04-15` still documented) and is unrelated to the auth method.
- **`npm run dev` silently moves to port 3001 when 3000 is taken.** Savion often has another project's dev server on 3000. Read the dev log for the real port before testing; requests to 3000 hit the other app and return confusing 404s.

## Architecture

Shape of the codebase. Update when architecture changes meaningfully.

- App Router (Next 16, Turbopack). All pages under `app/`. Server Components by default; client components marked with `"use client"` at the top.
- Auth: Supabase Auth (Google OAuth only). [proxy.ts](proxy.ts) runs `updateSession()` on every request, refreshes the Supabase cookie, and redirects unauthenticated users to `/login` (except `/`, `/go/*`, `/login`, `/auth/*`, `/share/*`). Sign-in flow: `/login` → `signInWithOAuth({provider: "google"})` → Google → `/auth/callback?code=...` → `exchangeCodeForSession` → redirect to `/`.
- Reads: [lib/queries.ts](lib/queries.ts), server-only. Always go through the cookies-aware server client. For an unauthenticated visitor (no Supabase cookie) the same client runs as the `anon` role; the `*_select_public` RLS policies are what let `/share/[handle]` read data — this is load-bearing, not incidental.
- Public front door: `/` ([app/page.tsx](app/page.tsx)) branches on auth. No session → resolves `OWNER_HANDLE` and renders [components/Showcase.tsx](components/Showcase.tsx) (the owner's projects). Session → the dashboard. The same route therefore serves two different pages.
- Click tracking: public app links point at [app/go/[...parts]/route.ts](app/go/[...parts]/route.ts) as `/go/<handle>/<day>?t=live|code` (`/go/<day>` means the site owner). It inserts into `app_events` against the page owner as the anon role and 302s to the URL stored on the entry. `&p=1` marks a click from the "Most popular" row. Crawlers and a signed-in owner on their own page are redirected but not recorded; a user's own authed views link directly.
- Views and ranking: on public pages [components/ViewTracker.tsx](components/ViewTracker.tsx) reports which cards were actually seen to [app/api/views/route.ts](app/api/views/route.ts), stored as `impression` events. The list order is a per-visitor shuffle ([lib/shuffle.ts](lib/shuffle.ts)). The SQL function `popular_apps(owner)` returns the top 3 by click rate among apps that clear the bar, and [components/PopularApps.tsx](components/PopularApps.tsx) shows them above the list. Only `source = 'list'` events count toward the rate.
- Leads: the "Notify me" form on each public card calls `submitInterest({ handle, … })` in [app/actions/interest.ts](app/actions/interest.ts) as the anon role → inserts into `app_interest` owned by that page's user → after the response, if that user has connected HighLevel, pushes the lead there and records the outcome through the `record_interest_sync()` SQL function. Not connected is normal: the lead is saved and marked skipped.
- HighLevel connection (optional, per user): Settings → `/api/crm/connect` → HighLevel → `/api/crm/callback` exchanges the code and stores tokens in `ghl_connections` via the secret-key client ([lib/supabase/admin.ts](lib/supabase/admin.ts)). [lib/ghl-connection.ts](lib/ghl-connection.ts) `getGhlAuthFor(userId)` is the only way code obtains an access token; it refreshes under a database lease because refresh tokens are single-use. The secret-key client is used for that table and nothing else.
- Admin: `/admin/*` belongs to whoever is signed in. [lib/session.ts](lib/session.ts) `requireUser()` runs in the layout and every page; reads rely on RLS (`owner_user_id = auth.uid()`), so they pass no user filter and each user sees only their own leads and clicks. [lib/owner.ts](lib/owner.ts) `isOwnerUser()` only decides who sees the site-setup checklist.
- Public sharing: [app/share/[handle]/page.tsx](app/share/[handle]/page.tsx) is reachable without a session and renders the same `Showcase`. `getProfileByHandle()` resolves the handle → `notFound()` if unclaimed → reads that user's entries/badges via the public RLS policies → renders read-only. Handle is set/cleared by [app/actions/profile.ts](app/actions/profile.ts) `setPublicHandle()` from the Share card on `/profile`.
- Writes: [app/actions/entries.ts](app/actions/entries.ts), Server Actions. `saveEntry()` validates → computes `day_number` from `profiles.challenge_start_date` via `dayNumberFor()` → insert/update → `refreshBadges()` recomputes earned badges and inserts any new ones → `revalidatePath()` for affected routes → returns `{ok: true, entryId, newBadges}`. Newly earned badges drive the ConfettiBurst on the client.
- State: server-driven. No global client state, no React Query, no Zustand. Pages re-render via `revalidatePath()` after mutations.
- Schema: see [supabase/migrations/0001_initial.sql](supabase/migrations/0001_initial.sql). RLS-first — every table has policies; users only see their own data, plus a public-read carveout gated on `profiles.public_handle` being non-null.
- Storage: single public `screenshots` bucket. Per-user write keyed on first folder segment matching `auth.uid()`.
- Badges: derived state stored as rows. `lib/badges.ts > computeEarnedBadges()` is the single source of truth. Recomputed on every entry save. See Open threads for caveat about removal.
- Streaks: pure function in [lib/streaks.ts](lib/streaks.ts). Strict definition — consecutive calendar days with an entry; one miss resets to 0 (today's miss is forgiven if today is in progress and yesterday is logged).
- Day number: computed from `challenge_start_date`, not from entry insertion order. Day 1 = `challenge_start_date`. Day 100 = `challenge_start_date + 99 days`. Out-of-range dates rejected by `saveEntry()` validation.
- Deployment: hosted on **Vercel**, project `still-inframes-projects/100-day-log`, live at `https://100dayaichallenge.com` + `https://100-day-log.vercel.app`. **Push to `main` auto-deploys** (GitHub↔Vercel connected + verified 2026-06-02) — normal workflow is just `git push`. Manual `npx --yes --cache /tmp/npm-vercel-cache vercel@latest --prod` still works as a fallback. Prod env vars (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`) live in Vercel project settings, separate from `.env.local`. Custom domain registered at GoDaddy with nameservers delegated to Vercel (`ns1/ns2.vercel-dns.com`); Vercel manages DNS + auto-SSL. The OAuth flow is domain-independent (Google redirects to the Supabase callback, not the app), so new domains only need to be added to Supabase Auth → Redirect URLs, never to Google Cloud.

## Key files

| Purpose | File |
|---|---|
| Dashboard (Day X/100, streak, today CTA, recent entries, recent badges) | [app/page.tsx](app/page.tsx) |
| New entry page | [app/log/page.tsx](app/log/page.tsx) |
| Entry form (create + edit, with screenshot upload + confetti) | [components/EntryForm.tsx](components/EntryForm.tsx) |
| Entry detail + edit + delete | [app/entries/[day]/page.tsx](app/entries/[day]/page.tsx) |
| All entries grid | [app/entries/page.tsx](app/entries/page.tsx) |
| Stats (totals, tech histogram, 100-day heatmap, mood trend) | [app/stats/page.tsx](app/stats/page.tsx) |
| Trophy case (9 badges, locked/unlocked) + Share settings | [app/profile/page.tsx](app/profile/page.tsx) |
| Public read-only share page | [app/share/[handle]/page.tsx](app/share/[handle]/page.tsx) |
| Challenge-complete celebration banner (gradient + confetti) | [components/CompletionBanner.tsx](components/CompletionBanner.tsx) |
| Public showcase body (used by `/` for anon and by `/share/[handle]`) | [components/Showcase.tsx](components/Showcase.tsx) |
| Tracked outbound-link redirect (records click, then 302) | [app/go/[...parts]/route.ts](app/go/[...parts]/route.ts) |
| Migration: `live_url`, nullable `repo_url`, `app_events` | [supabase/migrations/0002_telemetry_and_live_url.sql](supabase/migrations/0002_telemetry_and_live_url.sql) |
| Migration: `app_interest` leads, sync function, admin stats | [supabase/migrations/0003_app_interest.sql](supabase/migrations/0003_app_interest.sql) |
| "Notify me" form on each public card | [components/NotifyMeForm.tsx](components/NotifyMeForm.tsx) |
| Migration: `ghl_connections` + refresh lease function | [supabase/migrations/0004_ghl_connections.sql](supabase/migrations/0004_ghl_connections.sql) |
| Migration: view events, `source`, engagement stats, `popular_apps()` | [supabase/migrations/0005_views_and_popular.sql](supabase/migrations/0005_views_and_popular.sql) |
| Migration: `suspected_automated` flag on leads | [supabase/migrations/0006_suspected_automated.sql](supabase/migrations/0006_suspected_automated.sql) |
| View counting: browser tracker + endpoint | [components/ViewTracker.tsx](components/ViewTracker.tsx), [app/api/views/route.ts](app/api/views/route.ts) |
| "Most popular" row on public pages | [components/PopularApps.tsx](components/PopularApps.tsx) |
| Per-visitor shuffle | [lib/shuffle.ts](lib/shuffle.ts) |
| Crawler filter shared by clicks and views | [lib/bots.ts](lib/bots.ts) |
| Switch that keeps local dev from writing clicks/views | [lib/recording.ts](lib/recording.ts) |
| One-row badge chips on public pages | [components/BadgeStrip.tsx](components/BadgeStrip.tsx) |
| Server Actions: public signup + the user's own sync / text / test / disconnect | [app/actions/interest.ts](app/actions/interest.ts) |
| HighLevel HTTP client: OAuth + contact/note/SMS calls (server-only) | [lib/ghl.ts](lib/ghl.ts) |
| HighLevel connection store + token refresh | [lib/ghl-connection.ts](lib/ghl-connection.ts) |
| HighLevel connect flow (start, callback, shared cookies) | [app/api/crm/connect/route.ts](app/api/crm/connect/route.ts), [app/api/crm/callback/route.ts](app/api/crm/callback/route.ts), [lib/crm-oauth.ts](lib/crm-oauth.ts) |
| Secret-key Supabase client (bypasses RLS; `ghl_connections` only) | [lib/supabase/admin.ts](lib/supabase/admin.ts) |
| Signed-in check for admin pages | [lib/session.ts](lib/session.ts) |
| Site-owner check (front door + setup checklist only) | [lib/owner.ts](lib/owner.ts) |
| Admin: Interest / Clicks / Settings | [app/admin/page.tsx](app/admin/page.tsx), [app/admin/clicks/page.tsx](app/admin/clicks/page.tsx), [app/admin/settings/page.tsx](app/admin/settings/page.tsx) |
| Crawler rules | [app/robots.ts](app/robots.ts) |
| Public app card (compact; extra fields behind Details; no mood) | [components/PublicEntryCard.tsx](components/PublicEntryCard.tsx) |
| Share settings UI (set/clear handle, copy link) | [components/ShareSettings.tsx](components/ShareSettings.tsx) |
| Server Action: set/clear public_handle | [app/actions/profile.ts](app/actions/profile.ts) |
| Login (Google OAuth) | [app/login/page.tsx](app/login/page.tsx) |
| OAuth callback (code → session exchange) | [app/auth/callback/route.ts](app/auth/callback/route.ts) |
| Server Actions: save/delete entry, refresh badges | [app/actions/entries.ts](app/actions/entries.ts) |
| Reads: profile, entries, badges | [lib/queries.ts](lib/queries.ts) |
| Streak computation (current, longest, missed) | [lib/streaks.ts](lib/streaks.ts) |
| Badge logic (which badges are earned) | [lib/badges.ts](lib/badges.ts) |
| Date helpers + day-number math | [lib/dates.ts](lib/dates.ts) |
| Domain types + badge metadata (labels, emoji, descriptions) | [lib/types.ts](lib/types.ts) |
| Constants (TOTAL_DAYS = 100, common tech list) | [lib/constants.ts](lib/constants.ts) |
| Auth session refresh + route guard | [proxy.ts](proxy.ts), [lib/supabase/middleware.ts](lib/supabase/middleware.ts) |
| Supabase server client (cookies-aware) | [lib/supabase/server.ts](lib/supabase/server.ts) |
| Supabase browser client | [lib/supabase/client.ts](lib/supabase/client.ts) |
| Schema + RLS + Storage bucket + policies + triggers | [supabase/migrations/0001_initial.sql](supabase/migrations/0001_initial.sql) |
| User-facing setup steps (Supabase + OAuth + migration + dev) | [SETUP.md](SETUP.md) |
| Env vars (placeholders — replace before running) | [.env.local](.env.local) |
| Next.js config (turbopack.root, image remote patterns) | [next.config.ts](next.config.ts) |
| Framework-level rules (Next 16 breaking changes) | [AGENTS.md](AGENTS.md) |
