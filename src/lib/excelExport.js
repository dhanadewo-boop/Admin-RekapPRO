import * as XLSX from 'xlsx';

/**
 * Export invoices array to an Excel file matching the Penjualan format.
 * 
 * Output columns:
 *   A = Customer Name
 *   B = City  
 *   C = No. SPB
 *   D = Tanggal
 *   E = Nama Barang
 *   F = Qty
 *   G = Harga Satuan
 *   H = Diskon %
 *   I = "%"
 *   J = Subtotal
 *   K = Total Invoice (only on last product row)
 *
 * @param {Array} invoices - Array of invoice objects from Supabase
 * @param {string} filename - Output filename (default: 'Rekap_Penjualan.xlsx')
 */
export function exportRekapToExcel(invoices, filename = 'Rekap_Penjualan.xlsx') {
    const headers = [
        'Customer', 'Kota', 'No. SPB', 'Tanggal', 'Nama Barang',
        'Qty', 'Harga Satuan', 'Diskon', '%', 'Subtotal', 'Total Invoice'
    ];

    const rows = [headers];

    // Sort invoices by date
    const sorted = [...invoices].sort((a, b) => {
        return compareDates(a.invoiceDate, b.invoiceDate);
    });

    let seqNum = 0;

    for (const inv of sorted) {
        const products = inv.products || [];
        seqNum++;

        products.forEach((prod, idx) => {
            const isLast = idx === products.length - 1;
            rows.push([
                inv.customerName || '',
                inv.city || '',
                inv.invoiceNumber || '',
                inv.invoiceDate || '',
                prod.name || '',
                prod.qty || 0,
                prod.unitPrice || 0,
                prod.discountPercent || '',
                prod.discountPercent ? '%' : '',
                prod.subtotal || 0,
                isLast ? (inv.totalAmount || 0) : '',
            ]);
        });

        // If invoice has no products, still show one row
        if (products.length === 0) {
            rows.push([
                inv.customerName || '',
                inv.city || '',
                inv.invoiceNumber || '',
                inv.invoiceDate || '',
                '', 0, 0, '', '', 0,
                inv.totalAmount || 0,
            ]);
        }
    }

    // Create workbook & sheet
    const ws = XLSX.utils.aoa_to_sheet(rows);

    // Set column widths
    ws['!cols'] = [
        { wch: 25 },  // Customer
        { wch: 14 },  // Kota
        { wch: 10 },  // No. SPB
        { wch: 14 },  // Tanggal
        { wch: 22 },  // Nama Barang
        { wch: 8 },   // Qty
        { wch: 16 },  // Harga Satuan
        { wch: 6 },   // Diskon
        { wch: 3 },   // %
        { wch: 18 },  // Subtotal
        { wch: 18 },  // Total Invoice
    ];

    // Format number columns
    for (let r = 1; r < rows.length; r++) {
        const fmtCols = [5, 6, 9, 10]; // Qty, Harga, Subtotal, Total
        for (const c of fmtCols) {
            const addr = XLSX.utils.encode_cell({ r, c });
            if (ws[addr] && typeof ws[addr].v === 'number' && ws[addr].v > 0) {
                ws[addr].z = '#,##0';
            }
        }
    }

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Rekap Penjualan');

    // Trigger download
    XLSX.writeFile(wb, filename);
}

/**
 * Compare two date strings for sorting
 */
function compareDates(a, b) {
    const monthOrder = {
        'jan': 0, 'feb': 1, 'mar': 2, 'apr': 3, 'mei': 4, 'may': 4, 'jun': 5,
        'jul': 6, 'agu': 7, 'aug': 7, 'sep': 8, 'okt': 9, 'oct': 9, 'nov': 10, 'des': 11, 'dec': 11
    };

    const parse = (s) => {
        if (!s) return 0;
        const parts = String(s).split('-');
        if (parts.length !== 3) return 0;
        const day = parseInt(parts[0]) || 0;
        const mon = monthOrder[parts[1].toLowerCase()] || 0;
        const year = parseInt(parts[2]) || 0;
        return year * 10000 + mon * 100 + day;
    };

    return parse(a) - parse(b);
}
