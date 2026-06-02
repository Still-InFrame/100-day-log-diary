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

(none — Day 1 is live end-to-end as of 2026-06-02. Next challenge day is the next planned item.)

### Blocked

(none)

### Parked

- **Reminder notifications (email or browser)** — parked 2026-06-01 per Day 1 plan. Reason: needs hosted infra (email service like Resend, or service-worker push). Now unblocked since the app is deployed. Pick back up when: Savion misses a day and wants automated nudges.
- **Streak "grace day" mechanic** — parked 2026-06-01. Reason: discussed during planning but not built. Current rule is strict — miss a day, streak resets. Pick back up when: Savion misses a day and the strict reset feels bad.
- **Per-user timezone settings panel** — parked 2026-06-01. Reason: timezone is hardcoded to `America/New_York` in [lib/constants.ts](lib/constants.ts) (`DEFAULT_TIMEZONE`). Building a real settings UI (schema column on `profiles`, edit form, server action) is 30–60 min for a feature Savion would use maybe twice a year. Pick back up when: Savion travels for an extended period and the hardcoded timezone causes a real day-shift bug.

### Recently shipped

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

## Open threads

Known partial states + caveats in existing systems. Read before "fixing" anything in these areas. Different from Project status — these are CHRONIC NOTES on existing code, not work-in-progress.

- **`profiles.challenge_start_date` is auto-set and only editable via SQL.** Defaults to the date the user's `auth.users` row is created (via the `handle_new_user` trigger). No UI to edit. This already bit us once: Savion signed in June 2 but Day 1 was June 1, so day numbering was off by one until corrected via SQL (see 2026-06-02 changelog). Current value: `2026-06-01`. Workaround documented in SETUP.md troubleshooting. Permanent fix is a profile-edit UI (parked).
- **No magic-link / email auth fallback.** Login assumes Google OAuth is configured. If OAuth breaks, Savion cannot get in — there is no recovery path. Acceptable while single-user.
- **One entry per calendar date per user.** Schema enforces `unique (user_id, date)` AND `unique (user_id, day_number)`. Cannot log two apps for the same day (intentional). `date` is captured via `todayISO()` which uses `DEFAULT_TIMEZONE` (`America/New_York`) — see [lib/dates.ts](lib/dates.ts). If Savion travels OR the default timezone ever changes, an entry made near midnight Eastern could land on the "wrong" calendar day relative to a hostile reading. Tradeoff considered acceptable while single-user + single-timezone.
- **Badges are derived state stored as rows.** `lib/badges.ts > computeEarnedBadges()` recomputes from entries on every `saveEntry()`. Idempotent insert (unique on user_id + badge_type). If badge logic changes, existing badges are NOT retroactively removed — only new ones are added. To remove obsolete badges, manual `delete from badges` is needed.
- **Stored `day_number` can drift from live-computed day.** Each entry stores `day_number` at insert time, computed from `challenge_start_date` then. If `challenge_start_date` changes later (manually via SQL or via a future settings panel), old entries keep their original `day_number` while the dashboard's "Day X / 100" recomputes live — they will disagree. No recompute migration today. Savion asked to be reminded of this any time `challenge_start_date` changes; see Working agreements.
- **Public share page exposes ALL entry fields.** `/share/[handle]` renders every field including `mood` and `challenges` (Savion chose full transparency 2026-06-02). Anyone with the handle URL — no auth — sees everything. To hide fields later, filter in [app/share/[handle]/page.tsx](app/share/[handle]/page.tsx) + [components/PublicEntryCard.tsx](components/PublicEntryCard.tsx); the data is still protected at the row level (only public-handle owners are exposed), so it's a render-level change, not RLS. Public visibility hinges on `entries_select_public` / `badges_select_public` / `profiles_select_public` policies — verified working for the anon role 2026-06-02. If those policies change, the share page silently goes empty (renders 200 with no entries) rather than erroring.
- **Env vars live in two places now.** Dev reads `.env.local`; prod reads Vercel project settings (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, set for production/preview/development). If the Supabase publishable key ever rotates, update BOTH or prod breaks while dev works (or vice versa). `NEXT_PUBLIC_*` vars are inlined at build time, so after changing them in Vercel you must redeploy (`vercel --prod`) — a running deployment won't pick them up.
- **Docs-only pushes trigger full prod rebuilds.** GitHub↔Vercel is connected, so every push to `main` auto-builds and deploys to production — including docs-only changes (README, CLAUDE.md). Harmless but not free; add a Vercel "Ignored Build Step" later if the rebuilds become noise. Repo: `git@github.com:Still-InFrame/100-day-log-diary.git`, branch `main`, pushed over SSH key `~/.ssh/id_ed25519`.
- **Multi-lockfile environment.** A `package-lock.json` exists at `/Users/savionsmith/package-lock.json` outside this project. Turbopack initially picked that as workspace root. Fixed via `turbopack.root: __dirname`. If that config disappears, the warning returns.
- **`lucide-react` is installed but unused.** Was installed during initial dep batch in case icons were needed; never imported. Savion asked to keep for now but flag for revisit. If still unused by Day 10 of the challenge, propose `npm uninstall lucide-react`.
- **No automated tests, but smoke-testing as we build.** Savion's stated approach is to smoke test interactively in the browser during each build rather than write unit tests on Day 1. Higest-leverage candidates if/when test infra lands: `lib/streaks.ts > computeStreaks` (current/longest/missed edge cases) and `lib/badges.ts > computeEarnedBadges` (threshold + no_skip_100 logic).

## Gotchas

Things that took real time to figure out. Format: terse description + resolution. One example per distinct lesson.

- **This is NOT the Next.js you know (per AGENTS.md).** Next 16 has breaking changes from training-data Next. `middleware.ts` was renamed to `proxy.ts`, and the exported function must be named `proxy` (not `middleware`). Build will fail with "Proxy is missing expected function export name" if you forget. Read `node_modules/next/dist/docs/` for the relevant area before writing routing/middleware/turbopack code. Heed deprecation notices.
- **`create-next-app` rejects folder names with spaces/capitals.** It derives the npm package name from the folder ("name can only contain URL-friendly characters; can no longer contain capital letters"). Day 1's folder was originally `Day 1 - Log Diary`; worked around by scaffolding to `/tmp/log-diary-scaffold` then `cp -R` back + setting `package.json` name to `log-diary`. **Folder renamed to `day-01-log-diary` on 2026-06-02** — safe because git (`.git` moves with the dir), the `.vercel` link (IDs, not paths), and the live deploy (keyed off the GitHub repo) are all path-independent; only required stopping the dev server first. For Days 2–100: name folders URL-safe from the start (`day-02-<name>`) and the workaround is never needed.
- **Supabase RLS requires the cookies-aware server client.** Use [lib/supabase/server.ts](lib/supabase/server.ts) in Server Components, Server Actions, and Route Handlers. Use [lib/supabase/client.ts](lib/supabase/client.ts) only in `"use client"` components. Calling the browser client server-side (or vice versa) silently misses the user session and queries return 0 rows with no error — looks like "no data" instead of "auth bug."
- **Screenshot upload path format is load-bearing.** Uploads go to `screenshots/{user_id}/{ts}.{ext}`. The RLS policy `screenshots_user_write` checks that the FIRST folder name equals the auth UID. Changing the upload path in [components/EntryForm.tsx](components/EntryForm.tsx) without updating the SQL policy will break uploads with a permissions error.
- **`canvas-confetti` requires the bundled types package.** `npm install canvas-confetti` alone leaves TypeScript unhappy. Install `@types/canvas-confetti` as a dev dep alongside it.
- **Supabase deprecated the legacy "anon public" key.** New projects show a Publishable key (format `sb_publishable_...`) instead. It's a drop-in replacement for the anon key in `@supabase/ssr` / `createBrowserClient` / `createServerClient` — same parameter slot, same role (client-side public identification). Env var renamed to `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` to match. Do NOT search for or use the legacy anon key UI in new projects — it's hidden/legacy.
- **Google Cloud OAuth consent screen moved to "Google Auth Platform" with tabs.** The old single-wizard "OAuth consent screen" is now split into Overview / Branding / Audience / Clients / Data Access tabs. User-type (External) and Test users live under **Audience**; the OAuth client is created under **Clients**. Adding yourself as a Test user is mandatory while the app is in "Testing" mode — skipping it causes `Error 403: access_denied` at sign-in. The Supabase redirect URI to register in Google: `https://znhsntsutcbxjpadxzlt.supabase.co/auth/v1/callback` (must match exactly or `redirect_uri_mismatch`).
- **EntryForm fired the save server action twice per submit in dev.** Single click → two `POST` + two `saveEntry` calls (seen on both create and edit). `handleSubmit` code is correct (one `startTransition`), so cause is likely React Strict Mode in dev or a fast double-click. Harmless (unique constraint blocks dupes) but flashed a duplicate-key error on new entries. Fixed with a `submittingRef` lock in [components/EntryForm.tsx](components/EntryForm.tsx). If you ever remove that ref, the double-fire returns.
- **npm global installs fail on this machine (EACCES + needs root).** `npm i -g <pkg>` fails two ways: (1) `~/.npm/_cacache` has root-owned files (EACCES on rename), (2) the global prefix `/usr/local/lib/node_modules` needs root. Don't fight it with `sudo` (needs Savion's password). Workaround that works: run CLIs via `npx --yes --cache /tmp/npm-vercel-cache <pkg>@latest <cmd>` — the `--cache` flag dodges the corrupted cache, npx dodges the global prefix. This is how the Vercel CLI is invoked (see deploy notes).
- **`$VAR` holding a multi-word command doesn't word-split in zsh.** The login shell is zsh. `PREFIX='npx ... vercel@latest'; $PREFIX whoami` fails with "no such file or directory: npx ... vercel@latest" because zsh treats `$PREFIX` as one word (unlike bash). Write the full command inline, or use `${=PREFIX}` for zsh word-splitting.
- **Vercel CLI has no command for domain redirects (www → apex).** Done via the REST API instead: `PATCH https://api.vercel.com/v9/projects/{projectId}/domains/{domain}?teamId={teamId}` with body `{"redirect":"<apex>","redirectStatusCode":308}`. Token is in `~/Library/Application Support/com.vercel.cli/auth.json` (key `token`); projectId + orgId/teamId are in `.vercel/project.json`. This is how `www.100dayaichallenge.com` was set to 308-redirect to the apex.

## Architecture

Shape of the codebase. Update when architecture changes meaningfully.

- App Router (Next 16, Turbopack). All pages under `app/`. Server Components by default; client components marked with `"use client"` at the top.
- Auth: Supabase Auth (Google OAuth only). [proxy.ts](proxy.ts) runs `updateSession()` on every request, refreshes the Supabase cookie, and redirects unauthenticated users to `/login` (except `/login`, `/auth/*`, `/share/*`). Sign-in flow: `/login` → `signInWithOAuth({provider: "google"})` → Google → `/auth/callback?code=...` → `exchangeCodeForSession` → redirect to `/`.
- Reads: [lib/queries.ts](lib/queries.ts), server-only. Always go through the cookies-aware server client. For an unauthenticated visitor (no Supabase cookie) the same client runs as the `anon` role; the `*_select_public` RLS policies are what let `/share/[handle]` read data — this is load-bearing, not incidental.
- Public sharing: [app/share/[handle]/page.tsx](app/share/[handle]/page.tsx) is the only route the proxy lets through unauthenticated (besides `/login`, `/auth/*`). `getProfileByHandle()` resolves the handle → `notFound()` if unclaimed → reads that user's entries/badges via the public RLS policies → renders read-only. Handle is set/cleared by [app/actions/profile.ts](app/actions/profile.ts) `setPublicHandle()` from the Share card on `/profile`.
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
| Public entry card (read-only, all fields) | [components/PublicEntryCard.tsx](components/PublicEntryCard.tsx) |
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
