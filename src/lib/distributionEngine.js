import { supabase } from './supabase';
import { saveInvoice, upsertCustomer, upsertProduct, updateTargetProgress } from './db';

/**
 * Distribute confirmed invoice data:
 * 1. Upload image to Supabase Storage
 * 2. Save invoice record
 * 3. Update customer totals
 * 4. Update product sales
 * 5. Update target progress
 */
export async function distributeInvoice(invoiceData, imageBlob) {
    const { customerName, invoiceNumber, invoiceDate, products, totalAmount } = invoiceData;

    // 1. Upload image to Supabase Storage
    let imageUrl = '';
    if (imageBlob) {
        const timestamp = Date.now();
        const fileName = `invoices/${timestamp}_invoice.jpg`;
        const { data: uploadData, error: uploadErr } = await supabase.storage
            .from('invoice-images')
            .upload(fileName, imageBlob, { contentType: 'image/jpeg' });

        if (!uploadErr && uploadData) {
            const { data: urlData } = supabase.storage
                .from('invoice-images')
                .getPublicUrl(fileName);
            imageUrl = urlData.publicUrl;
        }
    }

    // 2. Save invoice to database
    const invoiceId = await saveInvoice({
        customerName, invoiceNumber, invoiceDate,
        products, totalAmount, imageUrl
    });

    // 3. Update customer totals
    await upsertCustomer(customerName, totalAmount);

    // 4. Update each product's sales
    for (const product of products) {
        await upsertProduct(product.name, product.qty, product.unitPrice);
    }

    // 5. Update target progress
    await updateTargetProgress(customerName, totalAmount);

    return invoiceId;
}
