-- 0011: an optional Meta Pixel per account
-- Safe to apply before the code that uses it ships: one nullable column.

-- The ID of the user's own Meta (Facebook) Pixel. When set, their public page
-- loads that pixel for visitors, so they can build retargeting audiences and
-- measure ads in Meta. Not a secret: a pixel ID is visible in the source of
-- any page that uses it, and this row is already readable by anyone once the
-- profile has a public handle.
alter table public.profiles
  add column if not exists meta_pixel_id text
  check (meta_pixel_id is null or meta_pixel_id ~ '^[0-9]{5,20}$');
