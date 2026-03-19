-- Remove legacy location/contact columns from stores.
-- Run this after the application is updated to not depend on these fields.

alter table if exists public.stores
  drop column if exists phone,
  drop column if exists latitude,
  drop column if exists longitude;

drop index if exists idx_stores_lat_lng;
