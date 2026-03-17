-- Fluxo de pre-cadastro com verificacao de email e telefone (OTP)
create extension if not exists pgcrypto;

create table if not exists public.signup_verifications (
  id uuid not null default gen_random_uuid(),
  name text not null,
  cpf text not null,
  phone text not null,
  email text not null,
  password_hash text not null,
  email_code text not null,
  phone_code text not null,
  email_code_expires_at timestamptz not null,
  phone_code_expires_at timestamptz not null,
  email_verified_at timestamptz null,
  phone_verified_at timestamptz null,
  last_email_sent_at timestamptz not null,
  last_phone_sent_at timestamptz not null,
  expires_at timestamptz not null,
  completed_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint signup_verifications_pkey primary key (id)
);

create index if not exists idx_signup_verifications_email
  on public.signup_verifications (email);

create index if not exists idx_signup_verifications_phone
  on public.signup_verifications (phone);

create index if not exists idx_signup_verifications_cpf
  on public.signup_verifications (cpf);

create index if not exists idx_signup_verifications_expires_at
  on public.signup_verifications (expires_at);
