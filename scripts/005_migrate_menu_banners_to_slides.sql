do $$
begin
  if to_regclass('public.menu_banners') is null then
    raise notice 'Tabela public.menu_banners nao existe. Execute 004_create_menu_banners_table.sql primeiro.';
    return;
  end if;
end $$;

alter table public.menu_banners
  add column if not exists duration integer not null default 5;

alter table public.menu_banners
  add column if not exists "order" integer not null default 0;

alter table public.menu_banners
  add column if not exists active boolean not null default true;

alter table public.menu_banners
  drop constraint if exists menu_banners_store_id_key;

with ranked as (
  select
    id,
    row_number() over (
      partition by store_id
      order by created_at asc, id asc
    ) as row_order
  from public.menu_banners
  where active = true
)
update public.menu_banners as mb
set "order" = ranked.row_order
from ranked
where mb.id = ranked.id;

create index if not exists idx_menu_banners_store_id
  on public.menu_banners using btree (store_id);

drop trigger if exists update_menu_banners_updated_at on public.menu_banners;
create trigger update_menu_banners_updated_at
before update on public.menu_banners
for each row
execute function update_updated_at_column();
