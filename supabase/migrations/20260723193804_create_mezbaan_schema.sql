/*
# Mezbaan Admin — Full Database Schema

## Overview
Creates the complete schema for the Mezbaan restaurant admin app, including
users, menu items, orders, order items, coupons, addresses, and FCM tokens.

## New Tables

1. `users` — App user profiles (extends Supabase auth.users)
   - `id` (uuid, PK, references auth.users)
   - `name` (text)
   - `email` (text, unique)
   - `phone` (text, nullable)
   - `picture` (text, nullable — URL)
   - `wallet` (numeric, default 0)
   - `referral_code` (text, unique)
   - `is_admin` (boolean, default false)
   - `google_id` (text, nullable)
   - `device_id` (text, nullable)
   - `created_at` (timestamptz)

2. `menu_items` — Restaurant menu items
   - `id` (uuid, PK)
   - `name` (text)
   - `description` (text, nullable)
   - `price` (numeric)
   - `category` (text)
   - `image` (text, nullable — URL)
   - `in_stock` (boolean, default true)
   - `is_veg` (boolean, default true)
   - `is_bestseller` (boolean, default false)
   - `rating` (numeric, default 0)
   - `prep_time` (integer, default 30)
   - `created_at` (timestamptz)

3. `orders` — Customer orders
   - `id` (uuid, PK)
   - `order_no` (text, unique)
   - `user_id` (uuid, references users)
   - `user_name` (text)
   - `user_phone` (text)
   - `address` (text)
   - `total` (numeric)
   - `status` (text, default 'received')
   - `payment_method` (text, default 'cod')
   - `payment_status` (text, default 'pending')
   - `razorpay_order_id` (text, nullable)
   - `razorpay_payment_id` (text, nullable)
   - `created_at` (timestamptz)

4. `order_items` — Items within an order
   - `id` (uuid, PK)
   - `order_id` (uuid, references orders ON DELETE CASCADE)
   - `item_id` (uuid, references menu_items)
   - `name` (text)
   - `price` (numeric)
   - `quantity` (integer)

5. `coupons` — Discount coupons
   - `id` (uuid, PK)
   - `code` (text, unique)
   - `discount_type` (text — 'flat' or 'percent')
   - `discount_value` (numeric)
   - `min_order` (numeric, default 0)
   - `max_uses` (integer, nullable)
   - `uses` (integer, default 0)
   - `active` (boolean, default true)
   - `expires_at` (timestamptz, nullable)
   - `created_at` (timestamptz)

6. `addresses` — Saved delivery addresses
   - `id` (uuid, PK)
   - `user_id` (uuid, references users)
   - `label` (text)
   - `line` (text)
   - `is_default` (boolean, default false)
   - `created_at` (timestamptz)

7. `fcm_tokens` — Firebase Cloud Messaging tokens for push notifications
   - `id` (uuid, PK)
   - `user_id` (uuid, references users)
   - `token` (text)
   - `device_id` (text, nullable)
   - `created_at` (timestamptz)

## Security (RLS)
- All tables have RLS enabled.
- `menu_items` and `coupons` are readable by anon + authenticated (public menu/coupons).
- `orders`, `order_items`, `addresses`, `fcm_tokens` are owner-scoped (authenticated, auth.uid = user_id).
- `users` table: users can read/update their own profile.
- Admin operations (managing orders, menu stock, coupons) are handled via the Edge Function using the service role key, bypassing RLS.

## Important Notes
1. The Edge Function uses the service role key for admin operations, so RLS on admin-managed tables only needs to cover the customer-facing app reads/writes.
2. The `users` table extends `auth.users` — the `id` column references `auth.users(id)`.
3. Order numbers are auto-generated as `MEZ-<timestamp>` format via a trigger.
*/

-- ============================================================
-- 1. USERS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT '',
  email text UNIQUE,
  phone text,
  picture text,
  wallet numeric NOT NULL DEFAULT 0,
  referral_code text UNIQUE NOT NULL DEFAULT upper(substr(md5(random()::text), 1, 8)),
  is_admin boolean NOT NULL DEFAULT false,
  google_id text,
  device_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_select_own" ON users;
CREATE POLICY "users_select_own" ON users FOR SELECT
  TO authenticated USING (auth.uid() = id);

DROP POLICY IF EXISTS "users_update_own" ON users;
CREATE POLICY "users_update_own" ON users FOR UPDATE
  TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "users_insert_own" ON users;
CREATE POLICY "users_insert_own" ON users FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = id);

-- ============================================================
-- 2. MENU_ITEMS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS menu_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  price numeric NOT NULL DEFAULT 0,
  category text NOT NULL DEFAULT 'Main',
  image text,
  in_stock boolean NOT NULL DEFAULT true,
  is_veg boolean NOT NULL DEFAULT true,
  is_bestseller boolean NOT NULL DEFAULT false,
  rating numeric NOT NULL DEFAULT 0,
  prep_time integer NOT NULL DEFAULT 30,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "menu_select_all" ON menu_items;
CREATE POLICY "menu_select_all" ON menu_items FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "menu_insert_auth" ON menu_items;
CREATE POLICY "menu_insert_auth" ON menu_items FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "menu_update_auth" ON menu_items;
CREATE POLICY "menu_update_auth" ON menu_items FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- 3. ORDERS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_no text UNIQUE NOT NULL DEFAULT ('MEZ-' || extract(epoch from now())::bigint),
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  user_name text NOT NULL DEFAULT '',
  user_phone text NOT NULL DEFAULT '',
  address text NOT NULL DEFAULT '',
  total numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'received',
  payment_method text NOT NULL DEFAULT 'cod',
  payment_status text NOT NULL DEFAULT 'pending',
  razorpay_order_id text,
  razorpay_payment_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "orders_select_own" ON orders;
CREATE POLICY "orders_select_own" ON orders FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "orders_insert_own" ON orders;
CREATE POLICY "orders_insert_own" ON orders FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "orders_update_own" ON orders;
CREATE POLICY "orders_update_own" ON orders FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- 4. ORDER_ITEMS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  item_id uuid REFERENCES menu_items(id) ON DELETE SET NULL,
  name text NOT NULL DEFAULT '',
  price numeric NOT NULL DEFAULT 0,
  quantity integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "order_items_select_own" ON order_items;
CREATE POLICY "order_items_select_own" ON order_items FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM orders WHERE orders.id = order_items.order_id AND orders.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "order_items_insert_own" ON order_items;
CREATE POLICY "order_items_insert_own" ON order_items FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM orders WHERE orders.id = order_id AND orders.user_id = auth.uid())
  );

-- ============================================================
-- 5. COUPONS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS coupons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  discount_type text NOT NULL DEFAULT 'flat',
  discount_value numeric NOT NULL DEFAULT 0,
  min_order numeric NOT NULL DEFAULT 0,
  max_uses integer,
  uses integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "coupons_select_all" ON coupons;
CREATE POLICY "coupons_select_all" ON coupons FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "coupons_insert_auth" ON coupons;
CREATE POLICY "coupons_insert_auth" ON coupons FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "coupons_update_auth" ON coupons;
CREATE POLICY "coupons_update_auth" ON coupons FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- 6. ADDRESSES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS addresses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES users(id) ON DELETE CASCADE,
  label text NOT NULL DEFAULT 'Home',
  line text NOT NULL DEFAULT '',
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE addresses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "addr_select_own" ON addresses;
CREATE POLICY "addr_select_own" ON addresses FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "addr_insert_own" ON addresses;
CREATE POLICY "addr_insert_own" ON addresses FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "addr_update_own" ON addresses;
CREATE POLICY "addr_update_own" ON addresses FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "addr_delete_own" ON addresses;
CREATE POLICY "addr_delete_own" ON addresses FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ============================================================
-- 7. FCM_TOKENS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS fcm_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES users(id) ON DELETE CASCADE,
  token text NOT NULL,
  device_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE fcm_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "fcm_select_own" ON fcm_tokens;
CREATE POLICY "fcm_select_own" ON fcm_tokens FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "fcm_insert_own" ON fcm_tokens;
CREATE POLICY "fcm_insert_own" ON fcm_tokens FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "fcm_delete_own" ON fcm_tokens;
CREATE POLICY "fcm_delete_own" ON fcm_tokens FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_menu_items_category ON menu_items(category);
CREATE INDEX IF NOT EXISTS idx_addresses_user_id ON addresses(user_id);
CREATE INDEX IF NOT EXISTS idx_fcm_tokens_user_id ON fcm_tokens(user_id);

-- ============================================================
-- 8. SEED DATA — MENU ITEMS
-- ============================================================
INSERT INTO menu_items (name, description, price, category, image, in_stock, is_veg, is_bestseller, rating, prep_time)
VALUES
  ('Chicken Biryani', 'Aromatic basmati rice cooked with tender chicken, saffron, and traditional spices', 320, 'Main', 'https://images.pexels.com/photos/12737665/pexels-photo-12737665.jpeg?auto=compress&cs=tinysrgb&w=400', true, false, true, 4.5, 35),
  ('Veg Biryani', 'Fragrant basmati rice with mixed vegetables, herbs, and biryani spices', 240, 'Main', 'https://images.pexels.com/photos/12737666/pexels-photo-12737666.jpeg?auto=compress&cs=tinysrgb&w=400', true, true, false, 4.2, 30),
  ('Mutton Korma', 'Slow-cooked mutton in a rich, creamy curry with yogurt and aromatic spices', 380, 'Main', 'https://images.pexels.com/photos/12737667/pexels-photo-12737667.jpeg?auto=compress&cs=tinysrgb&w=400', true, false, true, 4.7, 45),
  ('Paneer Tikka', 'Grilled cottage cheese marinated in spiced yogurt with bell peppers and onions', 280, 'Starter', 'https://images.pexels.com/photos/12737668/pexels-photo-12737668.jpeg?auto=compress&cs=tinysrgb&w=400', true, true, true, 4.6, 25),
  ('Butter Naan', 'Soft tandoor-baked flatbread brushed with butter', 40, 'Bread', 'https://images.pexels.com/photos/12737669/pexels-photo-12737669.jpeg?auto=compress&cs=tinysrgb&w=400', true, true, false, 4.3, 15),
  ('Gulab Jamun', 'Deep-fried milk dumplings soaked in rose-flavored sugar syrup', 120, 'Dessert', 'https://images.pexels.com/photos/12737670/pexels-photo-12737670.jpeg?auto=compress&cs=tinysrgb&w=400', true, true, true, 4.8, 20)
ON CONFLICT DO NOTHING;

-- ============================================================
-- 9. SEED DATA — COUPONS
-- ============================================================
INSERT INTO coupons (code, discount_type, discount_value, min_order, max_uses, uses, active, expires_at)
VALUES ('WELCOME50', 'flat', 50, 200, null, 0, true, null)
ON CONFLICT (code) DO NOTHING;
