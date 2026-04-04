-- Fridges + locks + inventory per fridge
-- 1) Add fridges module and per-fridge stock
-- 2) Evolve store_locks to pending/active/inactive with pending device_id nullable
-- 3) Backfill principal fridge and legacy stock/order history
-- 4) Provide transactional fridge code generation (G0001+ without gaps)

create extension if not exists pgcrypto;

alter table if exists public.store_locks
  add column if not exists status text;

update public.store_locks
set status = case when enabled = true then 'active' else 'inactive' end
where status is null;

alter table if exists public.store_locks
  alter column status set default 'active';

alter table if exists public.store_locks
  drop constraint if exists store_locks_status_check;

alter table if exists public.store_locks
  add constraint store_locks_status_check
  check (status = any (array['pending', 'active', 'inactive']));

alter table if exists public.store_locks
  alter column device_id drop not null;

update public.store_locks
set status = 'pending',
    enabled = false
where device_id is null
  and status <> 'pending';

alter table if exists public.store_locks
  drop constraint if exists store_locks_device_status_check;

alter table if exists public.store_locks
  add constraint store_locks_device_status_check
  check (
    (status = 'pending' and device_id is null and enabled = false)
    or
    (status in ('active', 'inactive') and device_id is not null)
  );

create or replace function public.format_fridge_code(code_number integer)
returns text
language sql
immutable
as $$
  select 'G' || lpad(greatest(code_number, 0)::text, 4, '0')
$$;

create table if not exists public.fridge_code_sequence (
  id boolean primary key default true check (id = true),
  last_value integer not null default 0,
  updated_at timestamptz not null default now()
);

insert into public.fridge_code_sequence (id, last_value)
values (true, 0)
on conflict (id) do nothing;

create table if not exists public.fridges (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  name text not null,
  code text not null,
  status text not null default 'active',
  is_primary boolean not null default false,
  lock_id uuid not null references public.store_locks(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint fridges_status_check check (status = any (array['active', 'inactive']))
);

create unique index if not exists uniq_fridges_code
  on public.fridges (code);

create unique index if not exists uniq_fridges_primary_per_store
  on public.fridges (store_id)
  where is_primary = true;

create unique index if not exists uniq_fridges_lock_id
  on public.fridges (lock_id);

create index if not exists idx_fridges_store_id
  on public.fridges (store_id);

create or replace function public.set_fridges_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_fridges_updated_at on public.fridges;

create trigger trg_fridges_updated_at
before update on public.fridges
for each row
execute function public.set_fridges_updated_at();

create or replace function public.ensure_fridge_lock_consistency()
returns trigger
language plpgsql
as $$
declare
  v_store_id uuid;
begin
  if new.lock_id is null then
    raise exception 'fridge.lock_id is required';
  end if;

  select store_id
    into v_store_id
  from public.store_locks
  where id = new.lock_id;

  if v_store_id is null then
    raise exception 'lock % not found for fridge', new.lock_id;
  end if;

  if v_store_id <> new.store_id then
    raise exception 'lock % belongs to another store', new.lock_id;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_fridges_lock_consistency on public.fridges;

create trigger trg_fridges_lock_consistency
before insert or update on public.fridges
for each row
execute function public.ensure_fridge_lock_consistency();

create table if not exists public.fridge_inventory (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  fridge_id uuid not null references public.fridges(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  quantity integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint fridge_inventory_quantity_check check (quantity >= 0),
  constraint fridge_inventory_unique unique (store_id, fridge_id, product_id)
);

create index if not exists idx_fridge_inventory_store_fridge
  on public.fridge_inventory (store_id, fridge_id);

create index if not exists idx_fridge_inventory_product
  on public.fridge_inventory (product_id);

create or replace function public.set_fridge_inventory_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_fridge_inventory_updated_at on public.fridge_inventory;

create trigger trg_fridge_inventory_updated_at
before update on public.fridge_inventory
for each row
execute function public.set_fridge_inventory_updated_at();

create or replace function public.ensure_fridge_inventory_store_consistency()
returns trigger
language plpgsql
as $$
declare
  v_store_id uuid;
begin
  select store_id
    into v_store_id
  from public.fridges
  where id = new.fridge_id;

  if v_store_id is null then
    raise exception 'fridge % not found for inventory row', new.fridge_id;
  end if;

  if v_store_id <> new.store_id then
    raise exception 'fridge % belongs to another store', new.fridge_id;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_fridge_inventory_store_consistency on public.fridge_inventory;

create trigger trg_fridge_inventory_store_consistency
before insert or update on public.fridge_inventory
for each row
execute function public.ensure_fridge_inventory_store_consistency();

create or replace function public.sync_product_stock_from_fridge_inventory()
returns trigger
language plpgsql
as $$
declare
  v_store_id uuid;
  v_product_id uuid;
  v_quantity integer;
begin
  v_store_id := coalesce(new.store_id, old.store_id);
  v_product_id := coalesce(new.product_id, old.product_id);

  select coalesce(sum(case when is_active then quantity else 0 end), 0)
    into v_quantity
  from public.fridge_inventory
  where store_id = v_store_id
    and product_id = v_product_id;

  insert into public.product_stock (store_id, product_id, quantity, updated_at)
  values (v_store_id, v_product_id, v_quantity, now())
  on conflict (store_id, product_id) do update
    set quantity = excluded.quantity,
        updated_at = excluded.updated_at;

  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_sync_product_stock_from_fridge_inventory on public.fridge_inventory;

create trigger trg_sync_product_stock_from_fridge_inventory
after insert or update or delete on public.fridge_inventory
for each row
execute function public.sync_product_stock_from_fridge_inventory();

alter table if exists public.stock_movements
  add column if not exists fridge_id uuid;

alter table if exists public.orders
  add column if not exists fridge_id uuid;

create index if not exists idx_stock_movements_fridge_id
  on public.stock_movements (fridge_id, created_at desc);

create index if not exists idx_orders_fridge_id
  on public.orders (fridge_id, created_at desc);

alter table if exists public.stock_movements
  drop constraint if exists stock_movements_fridge_id_fkey;

alter table if exists public.stock_movements
  add constraint stock_movements_fridge_id_fkey
  foreign key (fridge_id) references public.fridges(id) on delete set null;

alter table if exists public.orders
  drop constraint if exists orders_fridge_id_fkey;

alter table if exists public.orders
  add constraint orders_fridge_id_fkey
  foreign key (fridge_id) references public.fridges(id) on delete set null;

do $$
declare
  v_max_code integer;
begin
  select coalesce(max(substring(code from 2)::integer), 0)
    into v_max_code
  from public.fridges
  where code ~ '^G[0-9]+$';

  update public.fridge_code_sequence
  set last_value = greatest(last_value, v_max_code),
      updated_at = now()
  where id = true;
end;
$$;

insert into public.store_locks (
  store_id,
  device_id,
  enabled,
  is_primary,
  status,
  created_at,
  updated_at
)
select
  s.id as store_id,
  null as device_id,
  false as enabled,
  true as is_primary,
  'pending' as status,
  now(),
  now()
from public.stores s
where not exists (
  select 1
  from public.store_locks sl
  where sl.store_id = s.id
    and sl.status = 'active'
    and sl.device_id is not null
)
and not exists (
  select 1
  from public.store_locks sl
  where sl.store_id = s.id
    and sl.status = 'pending'
);

do $$
declare
  v_last_code integer;
  v_lock_id uuid;
  v_code text;
  rec record;
begin
  select last_value
    into v_last_code
  from public.fridge_code_sequence
  where id = true
  for update;

  for rec in
    select s.id as store_id
    from public.stores s
    where not exists (
      select 1
      from public.fridges f
      where f.store_id = s.id
        and f.is_primary = true
    )
    order by s.id
  loop
    select sl.id
      into v_lock_id
    from public.store_locks sl
    where sl.store_id = rec.store_id
    order by
      case when sl.status = 'active' and sl.device_id is not null then 0 else 1 end,
      case when sl.is_primary then 0 else 1 end,
      sl.created_at asc
    limit 1;

    if v_lock_id is null then
      continue;
    end if;

    v_last_code := v_last_code + 1;
    v_code := public.format_fridge_code(v_last_code);

    insert into public.fridges (
      store_id,
      name,
      code,
      status,
      is_primary,
      lock_id,
      created_at,
      updated_at
    )
    values (
      rec.store_id,
      'Geladeira Principal',
      v_code,
      'active',
      true,
      v_lock_id,
      now(),
      now()
    );
  end loop;

  update public.fridge_code_sequence
  set last_value = v_last_code,
      updated_at = now()
  where id = true;
end;
$$;

update public.orders o
set fridge_id = f.id
from public.fridges f
where o.fridge_id is null
  and f.store_id = o.store_id
  and f.is_primary = true;

update public.stock_movements sm
set fridge_id = f.id
from public.fridges f
where sm.fridge_id is null
  and f.store_id = sm.store_id
  and f.is_primary = true;

insert into public.fridge_inventory (
  store_id,
  fridge_id,
  product_id,
  quantity,
  is_active,
  created_at,
  updated_at
)
select
  ps.store_id,
  f.id as fridge_id,
  ps.product_id,
  greatest(ps.quantity, 0) as quantity,
  true as is_active,
  now(),
  now()
from public.product_stock ps
join public.fridges f
  on f.store_id = ps.store_id
 and f.is_primary = true
on conflict (store_id, fridge_id, product_id) do update
set quantity = excluded.quantity,
    is_active = true,
    updated_at = now();

insert into public.product_stock (store_id, product_id, quantity, updated_at)
select
  fi.store_id,
  fi.product_id,
  coalesce(sum(case when fi.is_active then fi.quantity else 0 end), 0) as quantity,
  now() as updated_at
from public.fridge_inventory fi
group by fi.store_id, fi.product_id
on conflict (store_id, product_id) do update
set quantity = excluded.quantity,
    updated_at = excluded.updated_at;

create or replace function public.peek_next_fridge_code()
returns text
language plpgsql
as $$
declare
  v_last integer;
begin
  select last_value into v_last
  from public.fridge_code_sequence
  where id = true;

  return public.format_fridge_code(coalesce(v_last, 0) + 1);
end;
$$;

create or replace function public.create_fridge_with_auto_code(
  p_store_id uuid,
  p_name text,
  p_lock_id uuid,
  p_expected_code text default null
)
returns table (
  success boolean,
  fridge_id uuid,
  code text,
  conflict boolean,
  next_code text,
  message text
)
language plpgsql
as $$
declare
  v_last_code integer;
  v_next_code integer;
  v_code text;
  v_fridge_id uuid;
  v_lock_store_id uuid;
  v_lock_status text;
  v_lock_device_id text;
  v_lock_taken boolean;
begin
  if p_store_id is null or p_lock_id is null then
    return query
    select false, null::uuid, null::text, false, null::text, 'INVALID_INPUT';
    return;
  end if;

  if p_name is null or btrim(p_name) = '' then
    return query
    select false, null::uuid, null::text, false, null::text, 'INVALID_NAME';
    return;
  end if;

  select store_id, status, device_id
    into v_lock_store_id, v_lock_status, v_lock_device_id
  from public.store_locks
  where id = p_lock_id
  for update;

  if v_lock_store_id is null then
    return query
    select false, null::uuid, null::text, false, null::text, 'LOCK_NOT_FOUND';
    return;
  end if;

  if v_lock_store_id <> p_store_id then
    return query
    select false, null::uuid, null::text, false, null::text, 'LOCK_STORE_MISMATCH';
    return;
  end if;

  if v_lock_status <> 'active' or v_lock_device_id is null then
    return query
    select false, null::uuid, null::text, false, null::text, 'LOCK_NOT_ACTIVE';
    return;
  end if;

  select exists(
    select 1
    from public.fridges f
    where f.lock_id = p_lock_id
  ) into v_lock_taken;

  if v_lock_taken then
    return query
    select false, null::uuid, null::text, false, null::text, 'LOCK_ALREADY_ASSIGNED';
    return;
  end if;

  select last_value
    into v_last_code
  from public.fridge_code_sequence
  where id = true
  for update;

  v_next_code := coalesce(v_last_code, 0) + 1;
  v_code := public.format_fridge_code(v_next_code);

  if p_expected_code is not null and upper(btrim(p_expected_code)) <> v_code then
    return query
    select false, null::uuid, null::text, true, v_code, 'CODE_CONFLICT';
    return;
  end if;

  insert into public.fridges (
    store_id,
    name,
    code,
    status,
    is_primary,
    lock_id,
    created_at,
    updated_at
  )
  values (
    p_store_id,
    btrim(p_name),
    v_code,
    'active',
    false,
    p_lock_id,
    now(),
    now()
  )
  returning id into v_fridge_id;

  update public.fridge_code_sequence
  set last_value = v_next_code,
      updated_at = now()
  where id = true;

  return query
  select true, v_fridge_id, v_code, false, v_code, 'CREATED';
end;
$$;

create or replace function public.reassign_lock_to_fridge(
  p_store_id uuid,
  p_fridge_id uuid,
  p_lock_id uuid
)
returns table (
  success boolean,
  swapped boolean,
  target_fridge_id uuid,
  source_fridge_id uuid,
  message text
)
language plpgsql
as $$
declare
  v_target_lock_id uuid;
  v_source_fridge_id uuid;
  v_lock_store_id uuid;
begin
  if p_store_id is null or p_fridge_id is null or p_lock_id is null then
    return query
    select false, false, null::uuid, null::uuid, 'INVALID_INPUT';
    return;
  end if;

  select f.lock_id
    into v_target_lock_id
  from public.fridges f
  where f.id = p_fridge_id
    and f.store_id = p_store_id
  for update;

  if v_target_lock_id is null then
    return query
    select false, false, null::uuid, null::uuid, 'TARGET_FRIDGE_NOT_FOUND';
    return;
  end if;

  select sl.store_id
    into v_lock_store_id
  from public.store_locks sl
  where sl.id = p_lock_id
  for update;

  if v_lock_store_id is null then
    return query
    select false, false, p_fridge_id, null::uuid, 'LOCK_NOT_FOUND';
    return;
  end if;

  if v_lock_store_id <> p_store_id then
    return query
    select false, false, p_fridge_id, null::uuid, 'LOCK_STORE_MISMATCH';
    return;
  end if;

  select f.id
    into v_source_fridge_id
  from public.fridges f
  where f.lock_id = p_lock_id
  for update;

  if v_source_fridge_id is null then
    update public.fridges
    set lock_id = p_lock_id,
        updated_at = now()
    where id = p_fridge_id
      and store_id = p_store_id;

    return query
    select true, false, p_fridge_id, null::uuid, 'LOCK_ASSIGNED';
    return;
  end if;

  if v_source_fridge_id = p_fridge_id then
    return query
    select true, false, p_fridge_id, p_fridge_id, 'LOCK_ALREADY_ASSIGNED';
    return;
  end if;

  update public.fridges
  set lock_id = v_target_lock_id,
      updated_at = now()
  where id = v_source_fridge_id;

  update public.fridges
  set lock_id = p_lock_id,
      updated_at = now()
  where id = p_fridge_id
    and store_id = p_store_id;

  return query
  select true, true, p_fridge_id, v_source_fridge_id, 'LOCK_SWAPPED';
end;
$$;
