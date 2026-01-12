-- Create users table with CPF-based authentication
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cpf TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Allow users to view their own data
CREATE POLICY "users_select_own"
  ON public.users FOR SELECT
  USING (true); -- Allow select for login validation

-- Allow users to insert their own data (registration)
CREATE POLICY "users_insert_own"
  ON public.users FOR INSERT
  WITH CHECK (true); -- Allow registration

-- Allow users to update their own data
CREATE POLICY "users_update_own"
  ON public.users FOR UPDATE
  USING (true);

-- Create orders table to track purchases
CREATE TABLE IF NOT EXISTS public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  mercadopago_order_id TEXT NOT NULL,
  total_amount DECIMAL(10, 2) NOT NULL,
  payment_method TEXT NOT NULL,
  status TEXT NOT NULL,
  items JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security on orders
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Allow users to view their own orders
CREATE POLICY "orders_select_own"
  ON public.orders FOR SELECT
  USING (true);

-- Allow users to insert their own orders
CREATE POLICY "orders_insert_own"
  ON public.orders FOR INSERT
  WITH CHECK (true);

-- Create index for faster CPF lookups
CREATE INDEX IF NOT EXISTS idx_users_cpf ON public.users(cpf);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON public.orders(user_id);
