-- Payment reliability hardening:
-- 1) unique local reference for Mercado Pago order
-- 2) idempotent webhook event storage
-- 3) MQTT lock command outbox
-- 4) processing claim lock for "processed" side effects

alter table public.orders
  add column if not exists processing_lock_at timestamptz null;

create unique index if not exists uniq_orders_mercadopago_order_id
  on public.orders (mercadopago_order_id);

create table if not exists public.webhook_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null default 'mercadopago',
  event_key text not null,
  action text null,
  mercadopago_order_id text null,
  payload jsonb null,
  created_at timestamptz not null default now(),
  constraint webhook_events_event_key_key unique (event_key)
);

create index if not exists idx_webhook_events_order_id
  on public.webhook_events (mercadopago_order_id);

create table if not exists public.lock_commands (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  store_id uuid not null references public.stores(id) on delete cascade,
  device_id text not null,
  socket_id text not null,
  topic text not null,
  payload jsonb not null,
  status text not null default 'pending',
  error text null,
  attempts integer not null default 0,
  last_attempt_at timestamptz null,
  sent_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint lock_commands_status_check
    check (status = any (array['pending', 'sent', 'failed', 'acked']))
);

create unique index if not exists uniq_lock_commands_order_socket
  on public.lock_commands (order_id, socket_id);

create index if not exists idx_lock_commands_status
  on public.lock_commands (status, created_at);

create or replace function public.set_lock_commands_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_lock_commands_updated_at on public.lock_commands;

create trigger trg_lock_commands_updated_at
before update on public.lock_commands
for each row
execute function public.set_lock_commands_updated_at();

