-- Per-device print agent credentials and enrollment flow.

create table if not exists public.print_agent_devices (
  id uuid primary key default gen_random_uuid(),
  device_id text not null,
  agent_id text not null,
  key_id text not null,
  hmac_secret_hash text not null,
  hmac_secret_ciphertext text not null,
  status text not null default 'active',
  min_supported_version text null,
  last_seen_at timestamptz null,
  last_status text null,
  last_error text null,
  last_agent_version text null,
  revoked_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint chk_print_agent_devices_status
    check (status in ('active', 'disabled', 'revoked'))
);

create unique index if not exists uniq_print_agent_devices_device_id
  on public.print_agent_devices (device_id);

create unique index if not exists uniq_print_agent_devices_key_id
  on public.print_agent_devices (key_id);

create index if not exists idx_print_agent_devices_status
  on public.print_agent_devices (status);

create table if not exists public.print_agent_enrollments (
  id uuid primary key default gen_random_uuid(),
  device_id text not null,
  agent_id text not null,
  token_hash text not null,
  qr_signature text not null,
  api_base_url text not null,
  expires_at timestamptz not null,
  consumed_at timestamptz null,
  revoked_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists uniq_print_agent_enrollments_token_hash
  on public.print_agent_enrollments (token_hash);

create index if not exists idx_print_agent_enrollments_device_id
  on public.print_agent_enrollments (device_id);

create index if not exists idx_print_agent_enrollments_expires_at
  on public.print_agent_enrollments (expires_at);

create or replace function public.set_print_agent_devices_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_print_agent_devices_updated_at on public.print_agent_devices;

create trigger trg_print_agent_devices_updated_at
before update on public.print_agent_devices
for each row
execute function public.set_print_agent_devices_updated_at();

create or replace function public.set_print_agent_enrollments_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_print_agent_enrollments_updated_at on public.print_agent_enrollments;

create trigger trg_print_agent_enrollments_updated_at
before update on public.print_agent_enrollments
for each row
execute function public.set_print_agent_enrollments_updated_at();
