-- =====================================================
-- Admin-RekapPRO — Tambahan Schema: product_targets
-- Tabel target per customer per produk (GROUP NAME)
-- Jalankan di Supabase Dashboard → SQL Editor → Run
-- =====================================================

-- Tabel ini menggantikan pendekatan customer_targets lama.
-- Dipakai oleh: Settings → Target Customer (UI CRUD)
-- Dipakai oleh: v_program_target (sumber data target)
-- PENTING: product_name = GROUP_NAME huruf KAPITAL (contoh: GANDASIL, DEKAMON 22.43)
-- PENTING: customer_name PERSIS sama dengan invoices.customer_name

CREATE TABLE IF NOT EXISTS product_targets (
  id            SERIAL PRIMARY KEY,
  customer_name TEXT    NOT NULL,
  product_name  TEXT    NOT NULL,          -- GROUP_NAME huruf kapital
  target_qty    NUMERIC NOT NULL DEFAULT 0,
  satuan        TEXT    NOT NULL DEFAULT 'DUS' CHECK (satuan IN ('DUS','LITER','KG')),
  tahun         INTEGER NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (customer_name, product_name, tahun)  -- 1 target per customer per produk per tahun
);

-- RLS
ALTER TABLE product_targets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated can read product targets" ON product_targets;
CREATE POLICY "Authenticated can read product targets"
  ON product_targets FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Admin can manage product targets" ON product_targets;
CREATE POLICY "Admin can manage product targets"
  ON product_targets FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));


-- ─── Verifikasi ───────────────────────────────────────────────────────────────
-- SELECT * FROM product_targets LIMIT 5;
-- SELECT COUNT(*) FROM product_targets;


-- ─── Catatan integrasi v_program_target ──────────────────────────────────────
-- View harus mengambil target dari product_targets (bukan customer_targets lama).
-- Contoh CTE target_customers di view:
--
-- target_customers AS (
--   SELECT
--     pt.customer_name,
--     pt.product_name,
--     pt.target_qty,
--     pt.satuan,
--     COALESCE(cam.area, 'NON TARGET') AS area,
--     COALESCE(cam.kota, '')           AS kota
--   FROM product_targets pt
--   LEFT JOIN customer_area_map cam ON cam.customer_name = pt.customer_name
--   WHERE pt.tahun = EXTRACT(YEAR FROM CURRENT_DATE)
-- )
--
-- Ini dikerjakan saat sesi Program Target nanti.
