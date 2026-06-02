# Setup — 100 Day Log Diary

Five steps to a running app. The code is already in place; you only need to plug in Supabase + Google OAuth credentials and run the migration.

## 1. Create a Supabase project (~3 min)

1. Go to https://app.supabase.com and sign in.
2. Click **New project** → pick the free tier.
3. Choose a name (e.g. `log-diary`) and a strong DB password. Save the password somewhere — you won't need it day to day, but you'll want it for future migrations.
4. Pick the region closest to you.
5. Wait ~1 minute for provisioning.

Once the project is ready:

- Go to **Settings → API**
- Copy **Project URL** → paste into `.env.local` as `NEXT_PUBLIC_SUPABASE_URL`
- Copy the **Publishable key** (starts with `sb_publishable_`) → paste into `.env.local` as `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
  - Supabase deprecated the legacy "anon public" key in favor of the publishable key. They're functionally equivalent for client-side use and `@supabase/ssr` accepts the publishable key in the same parameter slot.

## 2. Run the migration (~1 min)

In your Supabase dashboard:

1. Go to **SQL Editor** → **New query**.
2. Open `supabase/migrations/0001_initial.sql` from this repo, copy the entire contents, paste into the SQL editor.
3. Click **Run**.

You should see "Success. No rows returned." This creates the `profiles`, `entries`, and `badges` tables, all Row Level Security policies, the screenshots storage bucket, and the auto-profile-creation trigger.

## 3. Set up Google OAuth (~5 min)

You need a Google Cloud OAuth client, then connect it to Supabase.

### 3a. Create the Google OAuth client

1. Go to https://console.cloud.google.com.
2. Create a new project (or pick an existing one).
3. Go to **APIs & Services → OAuth consent screen**:
   - User type: **External**
   - App name: `100 Day Log` (or whatever)
   - User support email + developer contact email: your email
   - Save and continue through the rest (no scopes needed beyond the defaults).
   - Add your own email under **Test users** so you can sign in while the app is in "Testing" mode.
4. Go to **APIs & Services → Credentials → Create credentials → OAuth client ID**:
   - Application type: **Web application**
   - Name: `Log Diary local`
   - **Authorized redirect URIs**: add
     `https://YOUR-PROJECT-REF.supabase.co/auth/v1/callback`
     (find your project ref in your Supabase project URL — it's the part before `.supabase.co`)
   - Click **Create**.
5. Copy the **Client ID** and **Client secret** that pop up.

### 3b. Connect it to Supabase

1. Back in Supabase: **Authentication → Providers → Google**.
2. Toggle it on.
3. Paste in the Client ID and Client secret from step 3a.
4. Click **Save**.

### 3c. Add the local redirect

1. In Supabase: **Authentication → URL Configuration**.
2. **Site URL**: `http://localhost:3000`
3. **Redirect URLs** (add both):
   - `http://localhost:3000/**`
   - `http://localhost:3000/auth/callback`
4. Save.

## 4. Run the app

```bash
npm run dev
```

Open http://localhost:3000 — you'll be redirected to `/login`. Click **Continue with Google**, sign in, and you're in.

## 5. Log Day 1

Click **Log today's app**, fill in:

- App name: `100 Day Log Diary`
- Description: one line about what it does
- Repo URL: your GitHub URL (or `http://localhost:3000` for now)
- Tech stack: `Next.js`, `React`, `TypeScript`, `Tailwind`, `Supabase`, `Postgres`
- Time spent: however long this took you
- (optional) what you learned, mood, screenshot

Save. You should land back on the dashboard with **Day 1 of 100** showing.

## When you're ready to deploy

You're already using hosted Supabase, so deployment is just:

1. Push this repo to GitHub.
2. Go to https://vercel.com/new, import the repo.
3. Add the same two env vars (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`).
4. Deploy — get your Vercel URL.
5. In Google Cloud Console + Supabase: add the Vercel URL to the allowed redirect URIs.
6. In Supabase **URL Configuration**: change **Site URL** to your Vercel URL (or add it alongside localhost).

## Troubleshooting

- **OAuth redirects back with `error=oauth_failed`** — double-check the redirect URIs in both Google Cloud and Supabase match exactly (including `http` vs `https` and trailing paths).
- **"Row level security" errors when saving an entry** — confirm the migration ran successfully and that you signed in via Google (entries are scoped to `auth.uid()`).
- **Screenshots don't appear** — check the `screenshots` bucket exists under **Storage** in Supabase and is marked Public.
- **"Entry date must fall within Day 1–100"** — your profile's `challenge_start_date` defaults to the day you first signed up. To reset, in Supabase **Table editor → profiles**, update your row's `challenge_start_date` to today.
