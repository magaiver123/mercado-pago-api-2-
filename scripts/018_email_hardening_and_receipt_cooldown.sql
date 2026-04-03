-- Email hardening and receipt re-send cooldown
-- 1) cooldown persistence per order
-- 2) suppression list to block risky recipients after webhook events

alter table public.orders
  add column if not exists last_receipt_email_sent_at timestamptz null;

create table if not exists public.email_suppressions (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  reason text not null,
  source_event_type text not null,
  source_event_id text null,
  payload jsonb null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  released_at timestamptz null
);

create unique index if not exists uniq_email_suppressions_email
  on public.email_suppressions (email);

create index if not exists idx_email_suppressions_active
  on public.email_suppressions (email, released_at);

create or replace function public.set_email_suppressions_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_email_suppressions_updated_at on public.email_suppressions;

create trigger trg_email_suppressions_updated_at
before update on public.email_suppressions
for each row
execute function public.set_email_suppressions_updated_at();

