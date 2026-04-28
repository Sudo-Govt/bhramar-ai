-- Track Razorpay orders & payments
CREATE TABLE public.razorpay_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  order_id TEXT NOT NULL UNIQUE,
  payment_id TEXT,
  signature TEXT,
  plan TEXT NOT NULL,
  amount INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'INR',
  status TEXT NOT NULL DEFAULT 'created',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.razorpay_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "orders_select_own" ON public.razorpay_orders
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "orders_insert_own" ON public.razorpay_orders
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER trg_razorpay_orders_updated_at
BEFORE UPDATE ON public.razorpay_orders
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();