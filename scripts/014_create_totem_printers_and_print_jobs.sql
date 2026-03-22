-- ESC/POS printing foundation:
-- - one printer per totem (totem_printers)
-- - asynchronous print queue per totem (print_jobs)

create table if not exists public.totem_printers (
  id uuid primary key default gen_random_uuid(),
  totem_id uuid not null references public.totems(id) on delete cascade,
  store_id uuid not null references public.stores(id) on delete cascade,
  connection_type text not null default 'tcp',
  ip text not null,
  port integer not null default 9100,
  model text not null,
  escpos_profile text not null default 'generic',
  paper_width_mm integer not null default 80,
  is_active boolean not null default true,
  last_heartbeat_at timestamptz null,
  last_status text null,
  last_error text null,
  agent_version text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint chk_totem_printers_connection_type check (connection_type in ('tcp')),
  constraint chk_totem_printers_port_range check (port between 1 and 65535),
  constraint chk_totem_printers_paper_width check (paper_width_mm in (58, 76, 80, 82))
);

create unique index if not exists uniq_totem_printers_totem_id
  on public.totem_printers (totem_id);

create index if not exists idx_totem_printers_store_id
  on public.totem_printers (store_id);

create index if not exists idx_totem_printers_active
  on public.totem_printers (is_active);

create table if not exists public.print_jobs (
  id uuid primary key default gen_random_uuid(),
  totem_id uuid not null references public.totems(id) on delete cascade,
  store_id uuid not null references public.stores(id) on delete cascade,
  order_id text not null,
  action text not null default 'print_receipt',
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'pending',
  attempts integer not null default 0,
  claimed_at timestamptz null,
  claimed_by text null,
  printed_at timestamptz null,
  last_error text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint chk_print_jobs_status check (status in ('pending', 'claimed', 'printed', 'failed', 'canceled')),
  constraint chk_print_jobs_attempts_non_negative check (attempts >= 0)
);

create unique index if not exists uniq_print_jobs_totem_order_action
  on public.print_jobs (totem_id, order_id, action);

create index if not exists idx_print_jobs_totem_status_created
  on public.print_jobs (totem_id, status, created_at);

create index if not exists idx_print_jobs_store_created
  on public.print_jobs (store_id, created_at desc);

create or replace function public.set_totem_printers_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_totem_printers_updated_at on public.totem_printers;

create trigger trg_totem_printers_updated_at
before update on public.totem_printers
for each row
execute function public.set_totem_printers_updated_at();

create or replace function public.set_print_jobs_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_print_jobs_updated_at on public.print_jobs;

create trigger trg_print_jobs_updated_at
before update on public.print_jobs
for each row
execute function public.set_print_jobs_updated_at();
