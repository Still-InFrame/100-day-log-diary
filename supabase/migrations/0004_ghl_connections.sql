-- 0004: per-user HighLevel OAuth connections
-- Additive only, so it is safe to apply before the code that uses it ships.

-- One row per app user who has connected a HighLevel sub-account.
create table if not exists public.ghl_connections (
  user_id uuid primary key references auth.users(id) on delete cascade,
  location_id text not null,
  company_id text,
  ghl_user_id text,
  scope text,
  access_token text not null,
  refresh_token text not null,
  access_token_expires_at timestamptz not null,
  -- The redirect URI used when connecting; sent again on refresh.
  redirect_uri text,
  -- Lease held while one request refreshes the tokens (see ghl_claim_refresh).
  refresh_locked_until timestamptz,
  -- Set when HighLevel rejects the refresh token: the user must connect again.
  needs_reconnect boolean not null default false,
  last_error text,
  connected_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- RLS on with NO policies, and table privileges revoked: the browser-facing
-- roles can never read or write tokens. Only the server's secret key
-- (service_role) reaches this table.
alter table public.ghl_connections enable row level security;
revoke all on public.ghl_connections from anon, authenticated;

drop trigger if exists ghl_connections_touch_updated_at on public.ghl_connections;
create trigger ghl_connections_touch_updated_at
  before update on public.ghl_connections
  for each row execute function public.touch_updated_at();

-- HighLevel refresh tokens are single-use: refreshing returns a new one and
-- kills the old one. If two requests refreshed at once, one would store a
-- dead token and break the connection. This hands the refresh token to at
-- most one caller per lease window; everyone else gets no row and waits for
-- the winner to store the new tokens. It also returns no row when the access
-- token is no longer near expiry, so a request that read stale data just
-- before another one finished refreshing does not refresh a second time.
create or replace function public.ghl_claim_refresh(
  p_user_id uuid,
  p_lease_seconds int default 30,
  p_margin_seconds int default 300
)
returns table (refresh_token text)
language sql
security invoker
set search_path = public
as $$
  update public.ghl_connections c
     set refresh_locked_until = now() + make_interval(secs => p_lease_seconds)
   where c.user_id = p_user_id
     and (c.refresh_locked_until is null or c.refresh_locked_until < now())
     and c.access_token_expires_at < now() + make_interval(secs => p_margin_seconds)
  returning c.refresh_token;
$$;

revoke all on function public.ghl_claim_refresh(uuid, int, int) from public, anon, authenticated;
grant execute on function public.ghl_claim_refresh(uuid, int, int) to service_role;
