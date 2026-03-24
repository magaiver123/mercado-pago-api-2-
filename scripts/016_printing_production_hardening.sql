-- Printing production hardening:
-- - claimed job lease / stale-claim recovery
-- - normalized failure metadata
-- - claim-next atomic function

alter table public.print_jobs
  add column if not exists last_attempt_at timestamptz null,
  add column if not exists next_retry_at timestamptz null,
  add column if not exists lease_expires_at timestamptz null,
  add column if not exists error_code text null,
  add column if not exists error_retryable boolean null,
  add column if not exists printed_by_agent text null;

alter table public.print_jobs
  drop constraint if exists chk_print_jobs_status;

alter table public.print_jobs
  add constraint chk_print_jobs_status
  check (status in ('pending', 'claimed', 'printed', 'failed', 'canceled'));

alter table public.totem_printers
  drop constraint if exists chk_totem_printers_paper_width;

alter table public.totem_printers
  add constraint chk_totem_printers_paper_width
  check (paper_width_mm in (58, 76, 80, 82));

alter table public.print_global_settings
  drop constraint if exists chk_print_global_paper_width;

alter table public.print_global_settings
  add constraint chk_print_global_paper_width
  check (default_paper_width_mm in (58, 76, 80, 82));

create index if not exists idx_print_jobs_claimable
  on public.print_jobs (totem_id, status, next_retry_at, created_at);

create index if not exists idx_print_jobs_lease_expiry
  on public.print_jobs (status, lease_expires_at);

create index if not exists idx_print_jobs_store_status_created
  on public.print_jobs (store_id, status, created_at desc);

create or replace function public.claim_next_print_job(
  p_totem_id uuid,
  p_claimed_by text,
  p_now timestamptz,
  p_max_retry_attempts integer,
  p_lease_seconds integer
)
returns setof public.print_jobs
language plpgsql
as $$
declare
  v_job public.print_jobs%rowtype;
  v_lease_seconds integer := greatest(5, coalesce(p_lease_seconds, 5));
  v_max_retries integer := greatest(1, coalesce(p_max_retry_attempts, 1));
begin
  update public.print_jobs
  set
    status = case when attempts >= v_max_retries then 'failed' else 'pending' end,
    claimed_at = null,
    claimed_by = null,
    lease_expires_at = null,
    error_code = 'JOB_STALE_CLAIM',
    error_retryable = case when attempts >= v_max_retries then false else true end,
    next_retry_at = case when attempts >= v_max_retries then null else p_now end,
    last_error = coalesce(last_error, 'Claim expirado por falta de heartbeat')
  where totem_id = p_totem_id
    and status = 'claimed'
    and lease_expires_at is not null
    and lease_expires_at < p_now;

  with candidate as (
    select id
    from public.print_jobs
    where totem_id = p_totem_id
      and status = 'pending'
      and attempts < v_max_retries
      and (next_retry_at is null or next_retry_at <= p_now)
    order by created_at asc
    for update skip locked
    limit 1
  )
  update public.print_jobs as pj
  set
    status = 'claimed',
    claimed_by = p_claimed_by,
    claimed_at = p_now,
    attempts = pj.attempts + 1,
    last_attempt_at = p_now,
    lease_expires_at = p_now + make_interval(secs => v_lease_seconds),
    next_retry_at = null,
    error_code = null,
    error_retryable = null
  from candidate
  where pj.id = candidate.id
  returning pj.* into v_job;

  if v_job.id is null then
    return;
  end if;

  return next v_job;
end;
$$;

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
