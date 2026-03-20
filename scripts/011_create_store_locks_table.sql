-- Mapping between store and ESP lock device for MQTT openDoor command.

create table if not exists public.store_locks (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  device_id text not null,
  enabled boolean not null default true,
  is_primary boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_store_locks_store_id
  on public.store_locks (store_id);

create index if not exists idx_store_locks_device_id
  on public.store_locks (device_id);

create unique index if not exists uniq_store_locks_primary_per_store
  on public.store_locks (store_id)
  where is_primary = true and enabled = true;

create or replace function public.set_store_locks_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_store_locks_updated_at on public.store_locks;

create trigger trg_store_locks_updated_at
before update on public.store_locks
for each row
execute function public.set_store_locks_updated_at();
