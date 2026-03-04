-- FASE A - ALINHAMENTO STORE-AWARE (mercado-pago-api)
-- Execute o mesmo script usado no admin para manter sincronia entre projetos.
-- Este arquivo espelha os passos criticos de dados.

begin;

create table if not exists public.store_categories (
  id uuid not null default gen_random_uuid(),
  store_id uuid not null,
  category_id uuid not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint store_categories_pkey primary key (id),
  constraint store_categories_unique unique (store_id, category_id),
  constraint store_categories_store_id_fkey foreign key (store_id) references public.stores (id) on delete cascade,
  constraint store_categories_category_id_fkey foreign key (category_id) references public.categories (id) on delete cascade
);

insert into public.store_categories (store_id, category_id, is_active)
select distinct c.store_id, c.id, coalesce(c.is_active, true)
from public.categories c
where c.store_id is not null
on conflict (store_id, category_id) do update
set is_active = excluded.is_active;

insert into public.store_categories (store_id, category_id, is_active)
select distinct sp.store_id, p.category_id, true
from public.store_products sp
join public.products p on p.id = sp.product_id
on conflict (store_id, category_id) do nothing;

drop table if exists public.product_stock_new;

create table public.product_stock_new (
  store_id uuid not null,
  product_id uuid not null,
  quantity integer not null,
  updated_at timestamptz null default now(),
  constraint product_stock_new_pkey primary key (store_id, product_id),
  constraint product_stock_new_store_id_fkey foreign key (store_id) references public.stores (id) on delete cascade,
  constraint product_stock_new_product_id_fkey foreign key (product_id) references public.products (id) on delete cascade,
  constraint product_stock_new_quantity_check check (quantity >= 0)
);

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'product_stock'
      and column_name = 'store_id'
  ) then
    insert into public.product_stock_new (store_id, product_id, quantity, updated_at)
    select ps.store_id, ps.product_id, ps.quantity, coalesce(ps.updated_at, now())
    from public.product_stock ps
    on conflict (store_id, product_id) do update
    set quantity = excluded.quantity,
        updated_at = excluded.updated_at;
  else
    insert into public.product_stock_new (store_id, product_id, quantity, updated_at)
    select sp.store_id, ps.product_id, ps.quantity, coalesce(ps.updated_at, now())
    from public.product_stock ps
    join public.store_products sp on sp.product_id = ps.product_id
    on conflict (store_id, product_id) do update
    set quantity = excluded.quantity,
        updated_at = excluded.updated_at;
  end if;
end $$;

alter table public.product_stock rename to product_stock_legacy_20260304;
alter table public.product_stock_new rename to product_stock;

alter table public.stock_movements add column if not exists store_id uuid;

update public.stock_movements sm
set store_id = sub.store_id
from (
  select sm2.id, min(sp.store_id) as store_id
  from public.stock_movements sm2
  join public.store_products sp on sp.product_id = sm2.product_id
  where sm2.store_id is null
  group by sm2.id
) sub
where sm.id = sub.id
  and sm.store_id is null;

do $$
begin
  if exists (select 1 from public.stock_movements where store_id is null) then
    raise exception 'Existem registros em stock_movements sem store_id.';
  end if;
end $$;

alter table public.stock_movements alter column store_id set not null;

alter table public.stock_movements drop constraint if exists stock_movements_store_id_fkey;
alter table public.stock_movements
  add constraint stock_movements_store_id_fkey
  foreign key (store_id) references public.stores (id) on delete cascade;

alter table public.stock_movements drop constraint if exists stock_movements_user_id_fkey;
alter table public.stock_movements
  add constraint stock_movements_user_id_fkey
  foreign key (user_id) references public.users (id) on delete set null;

commit;
