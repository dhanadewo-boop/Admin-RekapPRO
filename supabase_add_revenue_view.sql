-- Membuat view untuk rekapitulasi revenue bulanan berdasarkan produk (bukan grup)
-- View ini mengambil data dari invoice_items dan invoices (untuk tanggal dan status)
-- dan mengelompokkan berdasarkan nama_produk dan bulan, menjumlahkan subtotal.

CREATE OR REPLACE VIEW v_rekap_revenue_bulanan AS
SELECT 
    EXTRACT(YEAR FROM i.date) AS tahun,
    EXTRACT(MONTH FROM i.date) AS bulan,
    ii.name AS nama_produk,
    SUM(ii.subtotal) AS total_revenue
FROM 
    invoice_items ii
JOIN 
    invoices i ON ii.invoice_id = i.id
WHERE 
    i.status != 'cancelled'
GROUP BY 
    1, 2, 3;
