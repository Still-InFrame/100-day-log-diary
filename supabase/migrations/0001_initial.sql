-- Day 1 Log Diary: initial schema
-- profiles: per-user metadata (challenge start, display info, public handle)
-- entries: one row per logged day
-- badges: earned milestone/streak badges

create extension if not exists "pgcrypto";

-- ---------- profiles ----------
create table public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  public_handle text unique,
  challenge_start_date date not null default current_date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = user_id);

create policy "profiles_select_public" on public.profiles
  for select using (public_handle is not null);

create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = user_id);

create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Auto-create a profile row whenever a new auth user is created.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (user_id, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- entries ----------
create table public.entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  day_number int not null check (day_number between 1 and 100),
  date date not null,
  app_name text not null,
  description text not null,
  repo_url text not null,
  tech_stack text[] not null default '{}',
  time_spent_minutes int not null check (time_spent_minutes >= 0),
  learnings text,
  challenges text,
  mood int check (mood between 1 and 5),
  screenshot_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, day_number),
  unique (user_id, date)
);

create index entries_user_date_idx on public.entries (user_id, date desc);

alter table public.entries enable row level security;

create policy "entries_select_own" on public.entries
  for select using (auth.uid() = user_id);

create policy "entries_select_public" on public.entries
  for select using (
    exists (
      select 1 from public.profiles p
      where p.user_id = entries.user_id and p.public_handle is not null
    )
  );

create policy "entries_insert_own" on public.entries
  for insert with check (auth.uid() = user_id);

create policy "entries_update_own" on public.entries
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "entries_delete_own" on public.entries
  for delete using (auth.uid() = user_id);

-- Keep updated_at in sync on any update.
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger entries_touch_updated_at
  before update on public.entries
  for each row execute function public.touch_updated_at();

create trigger profiles_touch_updated_at
  before update on public.profiles
  for each row execute function public.touch_updated_at();

-- ---------- badges ----------
create type badge_type as enum (
  'day_10', 'day_25', 'day_50', 'day_75', 'day_100',
  'streak_7', 'streak_30', 'streak_60', 'no_skip_100'
);

create table public.badges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  badge_type badge_type not null,
  earned_at timestamptz not null default now(),
  entry_id uuid references public.entries(id) on delete set null,
  unique (user_id, badge_type)
);

create index badges_user_idx on public.badges (user_id, earned_at desc);

alter table public.badges enable row level security;

create policy "badges_select_own" on public.badges
  for select using (auth.uid() = user_id);

create policy "badges_select_public" on public.badges
  for select using (
    exists (
      select 1 from public.profiles p
      where p.user_id = badges.user_id and p.public_handle is not null
    )
  );

create policy "badges_insert_own" on public.badges
  for insert with check (auth.uid() = user_id);

create policy "badges_delete_own" on public.badges
  for delete using (auth.uid() = user_id);

-- ---------- storage bucket for screenshots ----------
insert into storage.buckets (id, name, public)
values ('screenshots', 'screenshots', true)
on conflict (id) do nothing;

create policy "screenshots_public_read" on storage.objects
  for select using (bucket_id = 'screenshots');

create policy "screenshots_user_write" on storage.objects
  for insert with check (
    bucket_id = 'screenshots' and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "screenshots_user_update" on storage.objects
  for update using (
    bucket_id = 'screenshots' and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "screenshots_user_delete" on storage.objects
  for delete using (
    bucket_id = 'screenshots' and auth.uid()::text = (storage.foldername(name))[1]
  );
