-- =====================================================
-- Admin-RekapPRO — Settings Schema (Fase 1 Lengkap)
-- Jalankan di Supabase Dashboard → SQL Editor → Run
-- =====================================================

-- ─── 1. app_settings ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS app_settings (
  key        TEXT PRIMARY KEY,
  value      JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read settings"
  ON app_settings FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admin can manage settings"
  ON app_settings FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

-- Seed target 2026 (nilai awal = hardcode lama di RekapTarget.jsx)
INSERT INTO app_settings (key, value, updated_at)
VALUES ('target_penjualan_2026', '{"amount": 95000000000}', NOW())
ON CONFLICT (key) DO NOTHING;


-- ─── 2. customer_area_map ────────────────────────────────────────────────────
-- Mapping customer → area → kota
-- Dipakai: Settings → Area & Kota (UI)
-- Dipakai: v_program_target (JOIN untuk dapat area & kota)
-- PENTING: customer_name harus PERSIS sama dengan invoices.customer_name

CREATE TABLE IF NOT EXISTS customer_area_map (
  id            SERIAL PRIMARY KEY,
  customer_name TEXT NOT NULL UNIQUE,
  area          TEXT NOT NULL CHECK (area IN ('Area 1','Area 2','Area 3','Area 4','Area 5','NON TARGET')),
  kota          TEXT NOT NULL DEFAULT '',
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE customer_area_map ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read area map"
  ON customer_area_map FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admin can manage area map"
  ON customer_area_map FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));


-- ─── 3. Seed customer_area_map (OPSIONAL) ────────────────────────────────────
-- Uncomment dan sesuaikan dengan nama customer PERSIS di invoices.customer_name
-- Cek dulu: SELECT DISTINCT customer_name FROM invoices ORDER BY customer_name;

-- INSERT INTO customer_area_map (customer_name, area, kota) VALUES
--   ('PT. Nama Customer A', 'Area 1', 'Malang'),
--   ('PT. Nama Customer B', 'Area 2', 'Jember'),
--   ('PT. Nama Customer C', 'Area 3', 'Surabaya')
-- ON CONFLICT (customer_name) DO NOTHING;


-- ─── Verifikasi ───────────────────────────────────────────────────────────────
-- SELECT key, value FROM app_settings;
-- SELECT COUNT(*) FROM customer_area_map;
