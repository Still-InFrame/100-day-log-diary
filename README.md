# 100 Day Log Diary

A personal accountability tracker for a 100-day AI build challenge — ship one app per day, log it here, and watch the streak, stats, and milestone badges build up over the full 100 days.

**Live:** https://100dayaichallenge.com
**Public progress:** https://100dayaichallenge.com/share/savion

Built as Day 1 of the challenge (the tracker comes first, so it's dogfooded every day after).

## Features

- Google sign-in (Supabase Auth)
- Daily entry log: app name, description, repo/demo link, tech stack, time spent (required) + learnings, challenges, mood, screenshot (optional)
- Dashboard with Day X/100 progress, current/longest streak, days logged/missed
- Stats: total time, tech-stack histogram, 100-day calendar heatmap, mood trend
- Milestone + streak badges with a confetti celebration and a trophy case
- Public, read-only share page gated on an opt-in handle

## Stack

Next.js 16 (App Router, Turbopack) · React 19 · TypeScript · Tailwind v4 · Supabase (Postgres + Auth + Storage) · recharts · canvas-confetti · hosted on Vercel.

## Local development

```bash
npm install
npm run dev      # http://localhost:3000
```

Requires a `.env.local` with `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. Full first-time setup (Supabase project, schema migration, Google OAuth) is in [SETUP.md](SETUP.md).

```bash
npm run build    # production build
npx tsc --noEmit # type-check
npm run lint
```

## Deployment

Hosted on Vercel; connected to this repo, so pushes to `main` auto-deploy. Database and auth are a hosted Supabase project. Production env vars live in Vercel project settings.
