-- Script base atualizado para ambiente atual
-- Observacao:
-- - Este script cria apenas a base minima (stores, users, orders)
-- - Para migracao store-aware completa, execute tambem 002_store_sync_phase_a.sql

create extension if not exists pgcrypto;

create table if not exists public.stores (
  id uuid not null default gen_random_uuid(),
  name text not null,
  slug text not null,
  created_at timestamptz null default now(),
  updated_at timestamptz null default now(),
  status boolean null default true,
  cep text null,
  rua text null,
  numero text null,
  bairro text null,
  cidade text null,
  estado text null,
  constraint stores_pkey primary key (id),
  constraint stores_slug_key unique (slug)
);

create unique index if not exists unique_store_address
  on public.stores (rua, numero, bairro, cidade, estado);

create table if not exists public.users (
  id uuid not null default gen_random_uuid(),
  name text null,
  cpf text null,
  phone text null,
  email text not null,
  password_hash text not null,
  created_at timestamptz null default now(),
  last_access_at timestamptz null,
  tag text null,
  status text not null default 'ativo',
  role text not null default 'cliente',
  constraint users_pkey primary key (id),
  constraint users_email_key unique (email),
  constraint users_role_check check (role = any (array['admin', 'cliente']))
);

create index if not exists idx_users_cpf on public.users(cpf);

create sequence if not exists public.order_number_seq start with 1 increment by 1;

create table if not exists public.orders (
  id uuid not null default gen_random_uuid(),
  user_id uuid not null,
  mercadopago_order_id text not null,
  total_amount numeric(10, 2) not null,
  payment_method text not null,
  status text not null,
  items jsonb not null,
  created_at timestamptz null default now(),
  stock_processed boolean null default false,
  order_number integer null default nextval('order_number_seq'::regclass),
  store_id uuid not null,
  constraint orders_pkey primary key (id),
  constraint orders_store_id_fkey foreign key (store_id) references public.stores (id) on delete cascade,
  constraint orders_user_id_fkey foreign key (user_id) references public.users (id) on delete cascade
);

create index if not exists idx_orders_user_id on public.orders(user_id);
create index if not exists idx_orders_store_id on public.orders(store_id);
