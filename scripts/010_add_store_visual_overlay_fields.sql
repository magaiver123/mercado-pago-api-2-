-- Add visual overlay controls for public store cards.
-- Keeps stores.status behavior unchanged:
-- status=true -> appears, status=false -> hidden.

alter table if exists public.stores
  add column if not exists visual_status text not null default 'normal',
  add column if not exists visual_text text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'stores_visual_status_check'
  ) then
    alter table public.stores
      add constraint stores_visual_status_check
      check (visual_status = any (array['normal', 'manutencao', 'inauguracao']));
  end if;
end
$$;
