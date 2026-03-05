-- ================================================
-- Migration: Create invoice_items table
-- Run this in Supabase SQL Editor
-- ================================================

-- 1. Create invoice_items table
CREATE TABLE public.invoice_items (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  product_name text NOT NULL DEFAULT '',
  product_code text DEFAULT '',
  qty numeric DEFAULT 0,
  unit text DEFAULT 'dus',
  unit_price numeric DEFAULT 0,
  discount_percent numeric DEFAULT 0,
  subtotal numeric DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT invoice_items_pkey PRIMARY KEY (id)
);

-- 2. Migrate existing JSONB data to invoice_items
INSERT INTO invoice_items (invoice_id, product_name, product_code, qty, unit, unit_price, discount_percent, subtotal)
SELECT
  i.id,
  COALESCE(item->>'name', ''),
  COALESCE(item->>'productCode', ''),
  COALESCE((item->>'qty')::numeric, 0),
  COALESCE(item->>'unit', 'dus'),
  COALESCE((item->>'unitPrice')::numeric, 0),
  COALESCE((item->>'discountPercent')::numeric, COALESCE((item->>'discount')::numeric, 0)),
  COALESCE((item->>'subtotal')::numeric, 0)
FROM invoices i, jsonb_array_elements(i.products) AS item
WHERE i.products IS NOT NULL AND jsonb_array_length(i.products) > 0;

-- 3. Drop old products column
ALTER TABLE invoices DROP COLUMN IF EXISTS products;

-- 4. Enable RLS on new table (match existing policy)
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all" ON invoice_items FOR ALL USING (true) WITH CHECK (true);

-- 5. Enable realtime for invoice_items
ALTER PUBLICATION supabase_realtime ADD TABLE invoice_items;
