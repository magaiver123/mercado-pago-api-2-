-- Global printing settings shared across all stores/totems.

create table if not exists public.print_global_settings (
  id text primary key,
  default_connection_type text not null default 'tcp',
  default_port integer not null default 9100,
  default_escpos_profile text not null default 'generic',
  default_paper_width_mm integer not null default 80,
  queue_claim_interval_ms integer not null default 2500,
  heartbeat_interval_ms integer not null default 10000,
  max_retry_attempts integer not null default 5,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint chk_print_global_connection_type check (default_connection_type in ('tcp')),
  constraint chk_print_global_port_range check (default_port between 1 and 65535),
  constraint chk_print_global_paper_width check (default_paper_width_mm in (58, 76, 80, 82)),
  constraint chk_print_global_claim_interval check (queue_claim_interval_ms between 500 and 60000),
  constraint chk_print_global_heartbeat_interval check (heartbeat_interval_ms between 1000 and 120000),
  constraint chk_print_global_max_retry check (max_retry_attempts between 1 and 20)
);

insert into public.print_global_settings (id)
values ('default')
on conflict (id) do nothing;

create or replace function public.set_print_global_settings_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_print_global_settings_updated_at on public.print_global_settings;

create trigger trg_print_global_settings_updated_at
before update on public.print_global_settings
for each row
execute function public.set_print_global_settings_updated_at();
