-- Remove maps_url from stores table.
-- The application now builds the Google Maps link automatically from address fields.

alter table if exists public.stores
  drop column if exists maps_url;
