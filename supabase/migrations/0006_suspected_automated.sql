-- 0006: keep signups that trip the anti-bot field instead of discarding them
-- Additive only, so it is safe to apply before the code that uses it ships.

-- The "Notify me" form has a hidden field that people never see. It used to
-- make the server report success and store nothing when filled. Phone contact
-- autofill can fill hidden fields too, so that silently dropped real people.
-- Now such a signup is stored with this flag set and is not pushed to
-- HighLevel automatically; the owner reviews it in the admin.
alter table public.app_interest
  add column if not exists suspected_automated boolean not null default false;
