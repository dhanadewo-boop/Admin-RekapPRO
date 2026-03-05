import * as XLSX from 'xlsx';

/**
 * Parse an Excel file (Penjualan format) into grouped invoice objects.
 * 
 * Excel columns (0-indexed):
 *   A = Customer Name
 *   B = City
 *   C = SPB/Invoice Number
 *   D = Date
 *   E = Product Name
 *   F = Quantity
 *   G = Unit Price
 *   H = Discount %
 *   I = "%" symbol
 *   J = Subtotal (per product)
 *   K = Invoice Total (only on last row of each invoice group)
 *   M = Sequential number
 *
 * @param {File} file - The uploaded .xls/.xlsx file
 * @returns {Promise<Array>} Array of invoice objects grouped by invoice number
 */
export async function parseExcelFile(file) {
    const data = await file.arrayBuffer();
    const wb = XLSX.read(data, { type: 'array' });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

    // Group rows by invoice number (column C)
    const invoiceMap = new Map();

    for (const row of rows) {
        const customerName = String(row[0] || '').trim();
        const city = String(row[1] || '').trim();
        const invoiceNumber = String(row[2] || '').trim();
        const rawDate = row[3];
        const productName = String(row[4] || '').trim();
        const qty = parseNum(row[5]);
        const unitPrice = parseNum(row[6]);
        const discountPercent = parseNum(row[7]);
        const subtotal = parseNum(row[9]);
        const invoiceTotal = parseNum(row[10]);

        // Skip empty rows
        if (!customerName || !invoiceNumber) continue;

        if (!invoiceMap.has(invoiceNumber)) {
            invoiceMap.set(invoiceNumber, {
                customerName,
                city,
                invoiceNumber,
                invoiceDate: formatExcelDate(rawDate),
                products: [],
                totalAmount: 0,
            });
        }

        const inv = invoiceMap.get(invoiceNumber);

        // Add product
        inv.products.push({
            name: productName,
            qty,
            unitPrice,
            discountPercent: discountPercent || 0,
            subtotal: subtotal || (qty * unitPrice * (1 - discountPercent / 100)),
        });

        // Update total if this row has invoice total (column K)
        if (invoiceTotal > 0) {
            inv.totalAmount = invoiceTotal;
        }
    }

    // Calculate total for invoices that didn't have column K
    for (const inv of invoiceMap.values()) {
        if (!inv.totalAmount) {
            inv.totalAmount = inv.products.reduce((sum, p) => sum + (p.subtotal || 0), 0);
        }
    }

    return Array.from(invoiceMap.values());
}

/**
 * Parse a number from Excel cell value (handles string formatting with commas)
 */
function parseNum(val) {
    if (val == null || val === '') return 0;
    if (typeof val === 'number') return val;
    // Remove commas, spaces, trim
    const cleaned = String(val).replace(/,/g, '').replace(/\s/g, '').trim();
    const num = Number(cleaned);
    return isNaN(num) ? 0 : num;
}

/**
 * Convert Excel date to DD-MMM-YYYY string
 * Excel stores dates as serial numbers (days since 1900-01-01)
 */
function formatExcelDate(val) {
    if (!val) return '';

    // If it's already a string like "6-Jan-25"
    if (typeof val === 'string') {
        return normalizeDate(val);
    }

    // Excel serial date number
    if (typeof val === 'number') {
        const date = excelSerialToDate(val);
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
            'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
        const d = date.getDate();
        const m = months[date.getMonth()];
        const y = date.getFullYear();
        return `${d}-${m}-${y}`;
    }

    return String(val);
}

function excelSerialToDate(serial) {
    // Excel epoch is 1900-01-01, but has a bug where it thinks 1900 is a leap year
    const epoch = new Date(1899, 11, 30); // Dec 30, 1899
    return new Date(epoch.getTime() + serial * 86400000);
}

function normalizeDate(str) {
    // Try to normalize dates like "6-Jan-25" to "6-Jan-2025"
    const parts = str.split('-');
    if (parts.length === 3) {
        let year = parts[2].trim();
        if (year.length === 2) {
            year = '20' + year;
        }
        return `${parts[0].trim()}-${parts[1].trim()}-${year}`;
    }
    return str;
}
