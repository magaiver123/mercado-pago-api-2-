-- Expand stores table for the USERPROFILE public "Onde estamos" section.
-- This version is aligned with the current schema that already has:
-- name, slug, cep, rua, numero, bairro, cidade, estado.

create index if not exists idx_stores_status on public.stores (status);
create index if not exists idx_stores_cidade on public.stores (cidade);
