-- =====================================================
-- Admin-RekapPRO — Supabase Database Schema
-- Run this in Supabase SQL Editor (supabase.com → your project → SQL Editor)
-- =====================================================

-- 1. Users table (for role management)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'pimpinan', 'marketing')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Invoices table
CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_name TEXT NOT NULL,
  invoice_number TEXT,
  invoice_date TEXT,
  products JSONB DEFAULT '[]',
  total_amount NUMERIC DEFAULT 0,
  image_url TEXT DEFAULT '',
  status TEXT DEFAULT 'confirmed',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Customers table
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  total_transaksi NUMERIC DEFAULT 0,
  jumlah_invoice INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Products table
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  total_sold INTEGER DEFAULT 0,
  total_revenue NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Targets table
CREATE TABLE IF NOT EXISTS targets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_name TEXT UNIQUE NOT NULL,
  target_amount NUMERIC DEFAULT 0,
  current_amount NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- Row Level Security (RLS)
-- =====================================================

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE targets ENABLE ROW LEVEL SECURITY;

-- Policy: All authenticated users can read all data
CREATE POLICY "Users can read all users" ON users FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can read all invoices" ON invoices FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can read all customers" ON customers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can read all products" ON products FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can read all targets" ON targets FOR SELECT TO authenticated USING (true);

-- Policy: Admin can insert/update/delete
CREATE POLICY "Admin can insert invoices" ON invoices FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admin can update invoices" ON invoices FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admin can manage customers" ON customers FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admin can manage products" ON products FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

-- Admin & Pimpinan can manage targets
CREATE POLICY "Admin/Pimpinan can manage targets" ON targets FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'pimpinan')));

-- =====================================================
-- Enable Realtime
-- =====================================================
ALTER PUBLICATION supabase_realtime ADD TABLE invoices;
ALTER PUBLICATION supabase_realtime ADD TABLE customers;
ALTER PUBLICATION supabase_realtime ADD TABLE products;
ALTER PUBLICATION supabase_realtime ADD TABLE targets;

-- =====================================================
-- Create Storage Bucket
-- Run separately or via Supabase Dashboard → Storage
-- =====================================================
-- INSERT INTO storage.buckets (id, name, public) VALUES ('invoice-images', 'invoice-images', true);
