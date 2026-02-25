import { createWorker } from 'tesseract.js';

/**
 * Run OCR on an image file and return raw text
 */
export async function extractText(imageFile, onProgress) {
    const optimizedImage = await preprocessForOCR(imageFile);
    const worker = await createWorker('ind+eng', 1, {
        logger: (m) => {
            if (m.status === 'recognizing text' && onProgress) {
                onProgress(Math.round(m.progress * 100));
            }
        }
    });

    await worker.setParameters({
        tessedit_pageseg_mode: 6,
        preserve_interword_spaces: '1'
    });

    const { data: { text } } = await worker.recognize(optimizedImage);
    await worker.terminate();
    return text;
}

/**
 * Parse raw OCR text into structured invoice data
 * Optimized for "Surat Penyerahan Barang" format from PT. Kalatham
 * Also handles generic invoice formats as fallback
 */
export function parseInvoiceText(rawText) {
    const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean);
    const fullText = lines.join('\n');

    let customerName = '';
    let invoiceNumber = '';
    let invoiceDate = '';
    let products = [];
    let totalAmount = 0;
    let discount = 0;
    let subtotalBeforeDisc = 0;

    // ============================================================
    // 1. EXTRACT CUSTOMER NAME
    // ============================================================
    // Pattern: "Nama Customer : PT. Karisma Indoagro"
    const custPatterns = [
        /(?:nama\s*customer|customer\s*name|nama\s*pelanggan)\s*[:;=\-]\s*(.+)/i,
        /customer\s*[:;=\-]\s*(.+)/i,
        /kepada\s*yth\s*[:;=\-]\s*(.+)/i,
        /kepada\s*[:;=\-]\s*(.+)/i,
        /ditujukan\s*kepada\s*[:;=\-]\s*(.+)/i,
        /customer\s*[:;]\s*(.+)/i,
        /pelanggan\s*[:;]\s*(.+)/i,
        /pembeli\s*[:;]\s*(.+)/i,
        /bill\s*to\s*[:;]\s*(.+)/i,
        /sold\s*to\s*[:;]\s*(.+)/i,
    ];
    for (const pat of custPatterns) {
        const m = fullText.match(pat);
        if (m) {
            customerName = sanitizeCustomerName(m[1]);
            break;
        }
    }
    // Fallback: look for "PT." or "CV." or "Toko" on any line
    if (!customerName) {
        for (const line of lines) {
            const m = line.match(/\b((?:PT|CV|Toko|UD|TB|PD)\.?\s+[A-Za-z][A-Za-z\s.]+)/i);
            if (m && !line.toLowerCase().includes('kalatham') && !line.toLowerCase().includes('formulir') && !/^\s*tp\s*=\s*/i.test(line)) {
                customerName = sanitizeCustomerName(m[1]);
                break;
            }
        }
    }

    if (!customerName) {
        customerName = extractCustomerNameFromTemplate(lines);
    }

    // ============================================================
    // 2. EXTRACT INVOICE / SPB NUMBER
    // ============================================================
    const invPatterns = [
        /no\.?\s*spb\s*[:;]?\s*(\d[\d\-\/]*\d)/i,
        /spb\s*[:;]?\s*(\d[\d\-\/]*\d)/i,
        /no\.?\s*(?:invoice|faktur|nota|surat)\s*[:;]?\s*([A-Za-z0-9][\w\-\/]*)/i,
        /invoice\s*[:;#]?\s*([A-Za-z0-9][\w\-\/]*)/i,
        /faktur\s*[:;#]?\s*([A-Za-z0-9][\w\-\/]*)/i,
    ];
    for (const pat of invPatterns) {
        const m = fullText.match(pat);
        if (m) {
            invoiceNumber = m[1].trim();
            break;
        }
    }

    // ============================================================
    // 3. EXTRACT DATE
    // ============================================================
    const datePatterns = [
        // "Malang, 01-Sep-2025" or "Surabaya, 15/03/2026"
        /[A-Za-z]+,\s*(\d{1,2}[\-\/\.]\w+[\-\/\.]\d{2,4})/,
        // "Tgl.Berlaku : 2 Januari 2018"
        /(?:tgl|tanggal)\.?\s*(?:berlaku|invoice|faktur)?\s*[:;]?\s*(\d{1,2}\s+\w+\s+\d{4})/i,
        // "01-Sep-2025" standalone
        /(\d{1,2}[\-\/]\w{3,}[\-\/]\d{4})/,
        // "01/09/2025" or "01-09-2025"
        /(\d{1,2}[\-\/\.]\d{1,2}[\-\/\.]\d{2,4})/,
        // "2 Januari 2018"
        /(\d{1,2}\s+(?:Januari|Februari|Maret|April|Mei|Juni|Juli|Agustus|September|Oktober|November|Desember)\s+\d{4})/i,
    ];
    for (const pat of datePatterns) {
        const m = fullText.match(pat);
        if (m) {
            invoiceDate = m[1].trim();
            break;
        }
    }

    // ============================================================
    // 4. EXTRACT PRODUCTS (multiple strategies)
    // ============================================================

    // Strategy A: SPB format with kode barang
    // Pattern: "1 A1B0502 Gandasil Bunga, 24 x 500 gr 1250 dus 1.010.100 1.262.625.000"
    const productPatternA = /(\d+)\s+([A-Z]\d[A-Z]\d{3,4})\s+(.+?)\s+(\d[\d.]*)\s+(dus|pcs|box|btl|sak|kg|ltr|unit|unt|bks|pak|krt|gln|set)\s+([\d.]+)\s+([\d.]+)/gi;
    let matchA;
    while ((matchA = productPatternA.exec(fullText)) !== null) {
        const name = cleanValue(matchA[3]);
        const qty = parseNumber(matchA[4]);
        const unit = matchA[5];
        const unitPrice = parseNumber(matchA[6]);
        const lineTotal = parseNumber(matchA[7]);
        if (name && qty > 0) {
            products.push({ name, qty, unit, unitPrice, subtotal: lineTotal });
        }
    }

    // Strategy B: simpler table rows — "Nama Barang   Jumlah   Harga   Total"
    if (products.length === 0) {
        const productPatternB = /^[\d]+[.\s]+(.+?)\s{2,}(\d[\d.]*)\s+([\d.]+)\s+([\d.]+)\s*$/gm;
        let matchB;
        while ((matchB = productPatternB.exec(fullText)) !== null) {
            const name = cleanValue(matchB[1]);
            const qty = parseNumber(matchB[2]);
            const unitPrice = parseNumber(matchB[3]);
            const lineTotal = parseNumber(matchB[4]);
            if (name && qty > 0 && !name.toLowerCase().includes('total')) {
                products.push({ name, qty, unit: 'pcs', unitPrice, subtotal: lineTotal });
            }
        }
    }

    // Strategy C: any line with product-like pattern (name + number + number)
    if (products.length === 0) {
        for (const line of lines) {
            const lineLower = line.toLowerCase();
            if (lineLower.includes('total') || lineLower.includes('disc') || lineLower.includes('customer') ||
                lineLower.includes('alamat') || lineLower.includes('formulir') || lineLower.includes('npwp') ||
                lineLower.includes('dokumen') || lineLower.includes('barang dikirim')) continue;

            // Match: text followed by at least 2 numbers
            const m = line.match(/^(.{3,}?)\s+(\d[\d.]*)\s+(?:\w+\s+)?([\d.,]+)\s+([\d.,]+)\s*$/);
            if (m) {
                const name = cleanValue(m[1]);
                const qty = parseNumber(m[2]);
                const unitPrice = parseNumber(m[3]);
                const lineTotal = parseNumber(m[4]);
                if (name && qty > 0 && lineTotal > 100) {
                    products.push({ name, qty, unit: 'pcs', unitPrice, subtotal: lineTotal });
                }
            }
        }
    }

    // ============================================================
    // 5. EXTRACT DISCOUNT
    // ============================================================
    const discPatterns = [
        /disc(?:ount)?\s*[:=\-]?\s*(\d+(?:[.,]\d+)?)\s*%/i,
        /diskon\s*[:=\-]?\s*(\d+(?:[.,]\d+)?)\s*%/i,
        /potongan\s*[:=\-]?\s*(\d+(?:[.,]\d+)?)\s*%/i,
    ];
    for (const pat of discPatterns) {
        const m = fullText.match(pat);
        if (m) {
            discount = parseFloat(m[1].replace(',', '.'));
            break;
        }
    }

    // Also try to find disc amount directly
    const discAmountMatch = fullText.match(/(?:disc(?:ount)?|diskon|potongan)[^\n]*?([\d.,]{4,})/i);
    let discountAmount = 0;
    if (discAmountMatch) {
        discountAmount = parseNumber(discAmountMatch[1]);
    }

    // ============================================================
    // 6. EXTRACT TOTAL
    // ============================================================
    // Look for the final/largest total (usually last number on "Total" line)
    const totalLines = [];
    for (let i = 0; i < lines.length; i++) {
        const lineLower = lines[i].toLowerCase();
        if (lineLower.includes('total') && !lineLower.includes('kode') && !lineLower.includes('nama') && !lineLower.includes('harga')) {
            // Extract all numbers from this line
            const nums = lines[i].match(/[\d.]{4,}/g);
            if (nums) {
                for (const n of nums) {
                    const val = parseNumber(n);
                    if (val > 1000) totalLines.push(val);
                }
            }
        }
    }

    // Subtotal from products
    if (products.length > 0) {
        subtotalBeforeDisc = products.reduce((sum, p) => sum + (p.subtotal || 0), 0);
    }

    if (discount === 0 && discountAmount > 0 && subtotalBeforeDisc > 0) {
        discount = Math.round((discountAmount / subtotalBeforeDisc) * 10000) / 100;
    }

    // Determine the final total
    if (totalLines.length > 0) {
        // The last total on the page is usually the grand total
        totalAmount = totalLines[totalLines.length - 1];
    } else if (subtotalBeforeDisc > 0) {
        if (discount > 0) {
            totalAmount = subtotalBeforeDisc * (1 - discount / 100);
        } else if (discountAmount > 0) {
            totalAmount = subtotalBeforeDisc - discountAmount;
        } else {
            totalAmount = subtotalBeforeDisc;
        }
    }

    // If no total at all, sum product subtotals
    if (totalAmount === 0 && products.length > 0) {
        totalAmount = subtotalBeforeDisc;
    }

    return {
        customerName,
        invoiceNumber,
        invoiceDate,
        products,
        discount,
        discountAmount: discountAmount || (discount > 0 ? subtotalBeforeDisc * discount / 100 : 0),
        subtotalBeforeDisc,
        totalAmount: Math.round(totalAmount),
        rawText
    };
}

/**
 * Parse a number string with Indonesian format (dots as thousands separator)
 * Examples: "1.262.625.000" → 1262625000, "1,010,100" → 1010100
 */
function parseNumber(str) {
    if (!str) return 0;
    let cleaned = String(str).replace(/[^\d.,]/g, '');
    // Indonesian format: dots as thousands separators (e.g. 1.262.625.000)
    if (cleaned.match(/\.\d{3}/)) {
        cleaned = cleaned.replace(/\./g, '');
    }
    // US format: commas as thousands separators (e.g. 1,262,625,000)
    if (cleaned.match(/,\d{3}/)) {
        cleaned = cleaned.replace(/,/g, '');
    }
    cleaned = cleaned.replace(/,/g, '.');
    return parseFloat(cleaned) || 0;
}

/**
 * Clean extracted values — remove trailing punctuation, extra spaces, line artifacts
 */
function cleanValue(str) {
    return str
        .replace(/[\r\n]/g, ' ')
        .replace(/\s{2,}/g, ' ')
        .replace(/[|_]+$/g, '')
        .replace(/^\s*[:;]\s*/, '')
        .trim();
}

function sanitizeCustomerName(name) {
    if (!name) return '';
    return cleanValue(name)
        .replace(/^\s*tp\s*=\s*\w+\s*$/i, '')
        .replace(/^\s*tp\s*=\s*/i, '')
        .replace(/\s{2,}/g, ' ')
        .trim();
}

function extractCustomerNameFromTemplate(lines) {
    const blockedWords = ['kalatham', 'formulir', 'invoice', 'surat', 'npwp', 'gudang', 'harga', 'qty', 'total'];
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const lower = line.toLowerCase();
        if (!lower.includes('customer')) continue;

        const afterSeparator = line.split(/[:;=\-]/).slice(1).join(' ').trim();
        if (afterSeparator) {
            const candidate = sanitizeCustomerName(afterSeparator);
            if (candidate && !blockedWords.some(word => candidate.toLowerCase().includes(word))) {
                return candidate;
            }
        }

        for (let j = i + 1; j <= i + 2 && j < lines.length; j++) {
            const candidate = sanitizeCustomerName(lines[j]);
            if (
                candidate &&
                candidate.length >= 3 &&
                !/^\d/.test(candidate) &&
                !/^\s*tp\s*=\s*/i.test(candidate) &&
                !blockedWords.some(word => candidate.toLowerCase().includes(word))
            ) {
                return candidate;
            }
        }
    }
    return '';
}

async function preprocessForOCR(imageFile) {
    if (typeof document === 'undefined') return imageFile;

    try {
        const source = await loadImageElement(imageFile);
        const scale = 2;
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(source.width * scale);
        canvas.height = Math.round(source.height * scale);

        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) return imageFile;

        ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;

        for (let i = 0; i < data.length; i += 4) {
            const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
            const normalized = gray > 160 ? 255 : gray < 90 ? 0 : gray;
            data[i] = normalized;
            data[i + 1] = normalized;
            data[i + 2] = normalized;
        }

        ctx.putImageData(imageData, 0, 0);
        return canvas;
    } catch (error) {
        console.warn('Preprocessing OCR gagal, lanjut pakai gambar asli:', error);
        return imageFile;
    }
}

async function loadImageElement(file) {
    return new Promise((resolve, reject) => {
        const url = URL.createObjectURL(file);
        const image = new Image();
        image.onload = () => {
            URL.revokeObjectURL(url);
            resolve(image);
        };
        image.onerror = (err) => {
            URL.revokeObjectURL(url);
            reject(err);
        };
        image.src = url;
    });
}
