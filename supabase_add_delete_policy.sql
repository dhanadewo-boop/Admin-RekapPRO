-- =====================================================
-- Admin-RekapPRO — Supabase SQL Editor
-- Add missing DELETE policy for invoices
-- =====================================================

-- Allow Admin to delete invoices
CREATE POLICY "Admin can delete invoices" ON PUBLIC.invoices FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

-- Allow Admin to delete invoice_items
CREATE POLICY "Admin can delete invoice items" ON PUBLIC.invoice_items FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

-- Allow clearing all data (invoices, invoice_items, customers, products, targets) via a stored procedure
-- This is optional but safer to ensure atomic wipes
CREATE OR REPLACE FUNCTION reset_all_data()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER -- Run as database owner
AS $$
BEGIN
    -- Truncate heavily used tables
    TRUNCATE TABLE public.invoices CASCADE;
    
    -- Reset aggregate values instead of truncating everything
    UPDATE public.customers
    SET total_transaksi = 0,
        jumlah_invoice = 0,
        updated_at = NOW();

    UPDATE public.products
    SET total_sold = 0,
        total_revenue = 0,
        updated_at = NOW();

    UPDATE public.targets
    SET current_amount = 0,
        updated_at = NOW();
END;
$$;
