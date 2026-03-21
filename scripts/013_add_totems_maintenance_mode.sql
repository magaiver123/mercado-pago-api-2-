-- Add totem maintenance mode without changing existing active/inactive semantics.
-- Idempotent migration.

alter table public.totems
  add column if not exists maintenance_mode boolean not null default false;

