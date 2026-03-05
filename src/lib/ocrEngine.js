import { createWorker } from 'tesseract.js';
import * as pdfjsLib from 'pdfjs-dist';
import { matchCustomer, matchProduct, findProductByCode, getAllProducts } from './masterData.js';

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url
).toString();

/**
 * Check if a file is a PDF
 */
function isPDF(file) {
    return file.type === 'application/pdf' || file.name?.toLowerCase().endsWith('.pdf');
}

/**
 * Convert a PDF file into an array of canvas image blobs (one per page)
 * Renders at 2x scale for better OCR accuracy
 */
export async function pdfToImages(file) {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const images = [];

    for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const scale = 2.0; // Higher scale = better OCR accuracy
        const viewport = page.getViewport({ scale });

        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext('2d');

        await page.render({ canvasContext: ctx, viewport }).promise;

        // Convert canvas to blob
        const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
        images.push(blob);
    }

    return images;
}

/**
 * Run OCR on an image or PDF file and return raw text
 * For PDFs: renders each page to image, then OCRs all pages
 */
export async function extractText(imageFile, onProgress) {
    const worker = await createWorker('ind+eng', 1, {
        logger: (m) => {
            if (m.status === 'recognizing text' && onProgress) {
                // Scale progress based on whether it's multi-page
                onProgress(Math.round(m.progress * 100));
            }
        }
    });

    let fullText = '';

    if (isPDF(imageFile)) {
        // PDF: render pages to images, then OCR each
        const pageImages = await pdfToImages(imageFile);
        const totalPages = pageImages.length;

        for (let i = 0; i < totalPages; i++) {
            if (onProgress) {
                onProgress(Math.round((i / totalPages) * 100));
            }
            const { data: { text } } = await worker.recognize(pageImages[i]);
            fullText += text + '\n';
        }
    } else {
        // Image: direct OCR
        const { data: { text } } = await worker.recognize(imageFile);
        fullText = text;
    }

    await worker.terminate();
    return fullText;
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
    const custPatterns = [
        /nama\s*customer\s*[:;]?\s*(.+)/i,
        /kepada\s*[:;]?\s*(.+)/i,
        /customer\s*[:;]?\s*(.+)/i,
    ];
    for (const pat of custPatterns) {
        const m = fullText.match(pat);
        if (m) {
            customerName = cleanCustomerName(m[1]);
            break;
        }
    }
    if (!customerName) {
        for (const line of lines) {
            const m = line.match(/\b((?:PT|CV|Toko|UD|TB|PD)\.?\s+[A-Za-z][A-Za-z\s.]+)/i);
            if (m && !line.toLowerCase().includes('kalatham') && !line.toLowerCase().includes('formulir')) {
                customerName = cleanCustomerName(m[1]);
                break;
            }
        }
    }

    // ============================================================
    // 2. EXTRACT SPB/INVOICE NUMBER
    // ============================================================
    const spbVariants = ['spb', 'sp8', 'spe', 'sp6', '5pb', 's8b', 'sp0', 'spd'];

    for (let i = 0; i < lines.length; i++) {
        const lineLower = lines[i].toLowerCase();
        const hasSpb = spbVariants.some(v => lineLower.includes(v));
        if (hasSpb) {
            if (lineLower.includes('surat jalan')) continue;
            const nums = lines[i].match(/(\d{3,})/g);
            if (nums) {
                invoiceNumber = nums.reduce((best, n) => n.length > best.length ? n : best, '');
                break;
            }
            if (i + 1 < lines.length) {
                const nextNums = lines[i + 1].match(/(\d{3,})/g);
                if (nextNums) {
                    invoiceNumber = nextNums.reduce((best, n) => n.length > best.length ? n : best, '');
                    break;
                }
            }
        }
    }
    if (!invoiceNumber) {
        for (let i = 0; i < Math.min(10, lines.length); i++) {
            const m = lines[i].match(/(\d{5,7})/);
            if (m && !lines[i].toLowerCase().includes('npwp') && !lines[i].toLowerCase().includes('telp')) {
                invoiceNumber = m[1];
                break;
            }
        }
    }

    // ============================================================
    // 3. EXTRACT DATE
    // ============================================================
    // Priority: "Malang, 27-Jan-2026" (the actual invoice date at bottom)
    // Skip "Tgl.Berlaku" which is a form template date, not the invoice date
    const datePatterns = [
        // "Malang, 27-Jan-2026" or "Surabaya, 01-Sep-2025" (City, Date at bottom)
        /[A-Za-z]+,\s*(\d{1,2}[\-\/\.]\w+[\-\/\.]\d{2,4})/,
        // "01-Feb-2026" or "27-Jan-2026" standalone month name format
        /(\d{1,2}[\-\/][A-Za-z]{3,}[\-\/]\d{4})/,
        // "27 Januari 2026" with full month name
        /(\d{1,2}\s+(?:Januari|Februari|Maret|April|Mei|Juni|Juli|Agustus|September|Oktober|November|Desember)\s+\d{4})/i,
        // "Ctt : tgl 09-02-2026" from shipping notes
        /tgl\s+(\d{1,2}[\-\/\.]\d{1,2}[\-\/\.]\d{4})/i,
        // "01/09/2025" or "09-02-2026" (only match 4-digit year to avoid template dates)
        /(\d{1,2}[\-\/\.]\d{1,2}[\-\/\.]\d{4})/,
    ];
    for (const pat of datePatterns) {
        const m = fullText.match(pat);
        if (m) {
            const dateStr = m[1].trim();
            // Skip if this looks like the template date "2 Januari 2018"
            if (dateStr.includes('2018') || dateStr.includes('2017') || dateStr.includes('2016')) continue;
            invoiceDate = normalizeDate(dateStr);
            break;
        }
    }

    // ============================================================
    // 4. EXTRACT PRODUCTS (multiple strategies, combined)
    // ============================================================
    const seenProducts = new Set(); // Deduplicate by name

    const addProduct = (name, qty, unit, unitPrice, lineTotal) => {
        // Filter out junk: name too short, or zero/missing price with zero total
        if (!name || name.length <= 2) return;
        if (unitPrice <= 0 && lineTotal <= 0) return;
        const key = name.toLowerCase().replace(/\s+/g, '');
        if (seenProducts.has(key)) return;
        seenProducts.add(key);
        products.push({ name, qty, unit, unitPrice, subtotal: lineTotal, discountPercent: 0 });
    };

    // Strategy A: SPB format with kode barang — broadened pattern
    // "1 A2D0214 Dekamon 22,43 L, 50 x 100 cc 100 dus 985.680 98.568.000"
    const productPatternA = /(\d+)\s+([A-Za-z0-9]{1,4}\d{3,5})\s+(.+?)\s+(\d[\d.]*)\s+(dus|pcs|box|btl|sak|kg|ltr|unit|unt|bks|pak|krt|gln|set)\s+([\d.]+)\s+([\d.]+)/gi;
    let matchA;
    while ((matchA = productPatternA.exec(fullText)) !== null) {
        const name = cleanValue(matchA[3]);
        const qty = parseNumber(matchA[4]);
        const unit = matchA[5];
        const unitPrice = parseNumber(matchA[6]);
        const lineTotal = parseNumber(matchA[7]);
        if (name && qty > 0) {
            addProduct(name, qty, unit, unitPrice, lineTotal);
        }
    }

    // Strategy A2: Column-split approach — always run (additive)
    for (const line of lines) {
        const lineLower = line.toLowerCase();
        // Skip header, total, discount, and metadata lines
        if (lineLower.includes('total') || lineLower.includes('kode barang') ||
            lineLower.includes('nama barang') || lineLower.includes('harga satuan') ||
            lineLower.includes('customer') || lineLower.includes('alamat') ||
            lineLower.includes('formulir') || lineLower.includes('npwp') ||
            lineLower.includes('dokumen') || lineLower.includes('barang dikirim') ||
            lineLower.includes('disc') || lineLower.includes('pembayaran') ||
            lineLower.includes('stempel') || lineLower.includes('executive') ||
            lineLower.includes('revisi') || lineLower.includes('halaman') ||
            lineLower.includes('berlaku') || lineLower.includes('surat jalan') ||
            lineLower.includes('surat penyerahan') || lineLower.includes('penyerahan') ||
            lineLower.includes('ctt') || lineLower.includes('cara pembayaran') ||
            lineLower.includes('cash') || lineLower.includes('credit') ||
            lineLower.includes('nama jelas') || lineLower.includes('no.') ||
            lineLower.includes('malang') || lineLower.includes('jakarta')) continue;

        // Split by 2+ spaces to find column boundaries
        const cols = line.split(/\s{2,}/).map(c => c.trim()).filter(Boolean);
        if (cols.length < 3) continue;

        // Try to identify product rows: look for a product code and numbers
        let codeIdx = -1;
        let nameIdx = -1;
        for (let i = 0; i < Math.min(cols.length, 3); i++) {
            if (/^[A-Za-z0-9]{1,4}\d{3,5}$/.test(cols[i])) {
                codeIdx = i;
                break;
            }
        }

        if (codeIdx >= 0 && codeIdx + 1 < cols.length) {
            nameIdx = codeIdx + 1;
        } else {
            // Maybe the line starts with a row number and code
            const firstCol = cols[0];
            const rowCodeMatch = firstCol.match(/^(\d+)\s+([A-Za-z0-9]{1,4}\d{3,5})$/);
            if (rowCodeMatch) {
                codeIdx = 0;
                nameIdx = 1;
            } else {
                // Maybe code and name are merged: "A1B0501 Gandasil Bunga..."
                const mergedMatch = firstCol.match(/^(?:\d+\s+)?([A-Za-z0-9]{1,4}\d{3,5})\s+(.+)/);
                if (mergedMatch) {
                    codeIdx = 0;
                    const embeddedName = mergedMatch[2].trim();
                    const numericCols = [];
                    for (let i = 1; i < cols.length; i++) {
                        const cleaned = cols[i].replace(/\s*(dus|pcs|box|btl|sak|kg|ltr|unit|unt|bks|pak|krt|gln|set)\s*/gi, ' ').trim();
                        const parts = cleaned.split(/\s+/);
                        for (const part of parts) {
                            const num = parseNumber(part);
                            if (num > 0) numericCols.push(num);
                        }
                    }
                    if (numericCols.length >= 2 && embeddedName.length >= 2) {
                        let qty, unitPrice, lineTotal;
                        if (numericCols.length >= 3) {
                            qty = numericCols[0];
                            unitPrice = numericCols[numericCols.length - 2];
                            lineTotal = numericCols[numericCols.length - 1];
                        } else {
                            qty = numericCols[0];
                            unitPrice = numericCols[1] / numericCols[0];
                            lineTotal = numericCols[1];
                        }
                        const unitMatch = line.match(/\b(dus|pcs|box|btl|sak|kg|ltr|unit|unt|bks|pak|krt|gln|set)\b/i);
                        const unit = unitMatch ? unitMatch[1].toLowerCase() : 'dus';
                        addProduct(embeddedName, qty, unit, unitPrice, lineTotal);
                    }
                    continue;
                } else {
                    continue;
                }
            }
        }

        if (nameIdx < 0 || nameIdx >= cols.length) continue;

        // Extract the product name
        const productName = cleanValue(cols[nameIdx]);
        if (!productName || productName.length < 2) continue;

        // Find numeric columns (qty, unit price, line total)
        const numericCols = [];
        for (let i = nameIdx + 1; i < cols.length; i++) {
            const cleaned = cols[i].replace(/\s*(dus|pcs|box|btl|sak|kg|ltr|unit|unt|bks|pak|krt|gln|set)\s*/gi, ' ').trim();
            const parts = cleaned.split(/\s+/);
            for (const part of parts) {
                const num = parseNumber(part);
                if (num > 0) numericCols.push(num);
            }
        }

        if (numericCols.length >= 2) {
            let qty, unitPrice, lineTotal;
            if (numericCols.length >= 3) {
                qty = numericCols[0];
                unitPrice = numericCols[numericCols.length - 2];
                lineTotal = numericCols[numericCols.length - 1];
            } else {
                qty = 1;
                unitPrice = numericCols[0];
                lineTotal = numericCols[1];
            }

            if (lineTotal >= unitPrice && qty > 0) {
                const unitMatch = line.match(/\b(dus|pcs|box|btl|sak|kg|ltr|unit|unt|bks|pak|krt|gln|set)\b/i);
                const unit = unitMatch ? unitMatch[1].toLowerCase() : 'dus';
                addProduct(productName, qty, unit, unitPrice, lineTotal);
            }
        }
    }

    // Strategy M: Master-data-aware — search OCR text for known product codes
    if (products.length < 2) {
        const allMasterProducts = getAllProducts();
        for (const mp of allMasterProducts) {
            if (!mp.code) continue;
            const codeRegex = new RegExp('\\b' + mp.code.replace(/([A-Za-z])/g, (c) => `[${c.toLowerCase()}${c.toUpperCase()}]`) + '\\b');
            const codeMatch = fullText.match(codeRegex);
            if (codeMatch) {
                const codePos = fullText.indexOf(codeMatch[0]);
                const lineStart = fullText.lastIndexOf('\n', codePos) + 1;
                const lineEnd = fullText.indexOf('\n', codePos);
                const codeLine = fullText.substring(lineStart, lineEnd > 0 ? lineEnd : fullText.length);
                const nums = codeLine.match(/[\d.]{3,}/g);
                if (nums) {
                    const parsedNums = nums.map(n => parseNumber(n)).filter(n => n > 0);
                    if (parsedNums.length >= 2) {
                        const qty = parsedNums[0];
                        const unitPrice = parsedNums[parsedNums.length - 2];
                        const lineTotal = parsedNums[parsedNums.length - 1];
                        addProduct(mp.name, qty, 'dus', unitPrice > 0 ? unitPrice : mp.price, lineTotal);
                    } else if (parsedNums.length === 1) {
                        const qty = parsedNums[0];
                        addProduct(mp.name, qty, 'dus', mp.price, qty * mp.price);
                    }
                }
            }
        }
    }

    // Strategy B: simpler table rows (fallback) 
    if (products.length === 0) {
        const productPatternB = /^[\d]+[.\s]+(.+?)\s{2,}(\d[\d.]*)\s+([\d.]+)\s+([\d.]+)\s*$/gm;
        let matchB;
        while ((matchB = productPatternB.exec(fullText)) !== null) {
            const name = cleanValue(matchB[1]);
            const qty = parseNumber(matchB[2]);
            const unitPrice = parseNumber(matchB[3]);
            const lineTotal = parseNumber(matchB[4]);
            if (name && qty > 0 && !name.toLowerCase().includes('total')) {
                addProduct(name, qty, 'pcs', unitPrice, lineTotal);
            }
        }
    }

    // Strategy C: any line with product-like pattern (name + numbers)
    if (products.length === 0) {
        for (const line of lines) {
            const lineLower = line.toLowerCase();
            if (lineLower.includes('total') || lineLower.includes('disc') || lineLower.includes('customer') ||
                lineLower.includes('alamat') || lineLower.includes('formulir') || lineLower.includes('npwp') ||
                lineLower.includes('dokumen') || lineLower.includes('barang dikirim')) continue;

            const m = line.match(/^(.{3,}?)\s+(\d[\d.]*)\s+(?:\w+\s+)?([\d.,]+)\s+([\d.,]+)\s*$/);
            if (m) {
                const name = cleanValue(m[1]);
                const qty = parseNumber(m[2]);
                const unitPrice = parseNumber(m[3]);
                const lineTotal = parseNumber(m[4]);
                if (name && qty > 0 && lineTotal > 100) {
                    addProduct(name, qty, 'pcs', unitPrice, lineTotal);
                }
            }
        }
    }

    // ============================================================
    // 5. EXTRACT PER-PRODUCT DISCOUNTS
    // ============================================================
    // Parse lines like "Diskon Masalgin 2%", "Discount Dekamon 4%"
    // Assign discount to matching products by fuzzy name matching
    const perProductDiscounts = [];
    const discLinePatterns = [
        /dis[ck](?:on|ount)?\s+(.+?)\s+(\d+)\s*%/gi,
    ];
    for (const pat of discLinePatterns) {
        let m;
        while ((m = pat.exec(fullText)) !== null) {
            const productHint = m[1].trim().toLowerCase();
            const discPct = parseInt(m[2]);
            if (discPct > 0 && discPct <= 100) {
                perProductDiscounts.push({ hint: productHint, discount: discPct });
            }
        }
    }

    // Assign discounts to matching products
    if (perProductDiscounts.length > 0) {
        for (const p of products) {
            const pNameLower = p.name.toLowerCase();
            for (const d of perProductDiscounts) {
                const hintWords = d.hint.split(/\s+/);
                const mainHint = hintWords[0];
                if (pNameLower.includes(mainHint)) {
                    p.discountPercent = d.discount;
                    break;
                }
            }
            if (!p.discountPercent) p.discountPercent = 0;
        }
        discount = 0;
    } else {
        // Fallback: try to find a single global discount
        // Broadened patterns to catch "Disc 4%", "Diskon : 4%", "Discount: 4%", "disc. 4 %" etc.
        const globalDiscPatterns = [
            /dis[ck](?:on|ount|\.)?\s*[:;]?\s*(\d+)\s*%/i,
            /potongan\s*[:;]?\s*(\d+)\s*%/i,
            /dis[ck](?:on|ount|\.)?\s+.*?(\d+)\s*%/i,
        ];
        for (const pat of globalDiscPatterns) {
            const m = fullText.match(pat);
            if (m) {
                discount = parseInt(m[1]);
                if (discount > 0 && discount <= 100) {
                    for (const p of products) {
                        p.discountPercent = discount;
                    }
                    break;
                }
            }
        }
        if (discount === 0) {
            for (const p of products) {
                p.discountPercent = 0;
            }
        }
    }

    // ============================================================
    // 6. CALCULATE TOTALS (per-product)
    // ============================================================
    let discountAmount = 0;

    // Subtotal from products (before any discount)
    if (products.length > 0) {
        subtotalBeforeDisc = products.reduce((sum, p) => {
            // subtotal at this point is the gross line total (qty * unitPrice)
            return sum + (p.subtotal || 0);
        }, 0);
    }

    // Calculate per-product discount amounts, then update subtotal to net amount
    for (const p of products) {
        const pDisc = p.discountPercent || 0;
        const grossAmount = (p.qty || 0) * (p.unitPrice || 0);
        const discAmt = Math.round(grossAmount * pDisc / 100);
        // subtotal becomes the NET amount (after discount) — this is what RekapPage displays
        p.subtotal = grossAmount - discAmt;
    }

    // Total discount = sum of all per-product discounts
    discountAmount = products.reduce((sum, p) => {
        const grossAmount = (p.qty || 0) * (p.unitPrice || 0);
        return sum + Math.round(grossAmount * (p.discountPercent || 0) / 100);
    }, 0);

    // Grand total = subtotal - total discount
    totalAmount = subtotalBeforeDisc - discountAmount;

    // ============================================================
    // 7. POST-PROCESS: FUZZY MATCH AGAINST MASTER DATA
    // ============================================================
    let matchedCustomer = null;
    if (customerName) {
        const custResult = matchCustomer(customerName);
        if (custResult.match) {
            matchedCustomer = custResult.match;
            customerName = custResult.match.name;
        }
    }

    products = products.map(p => {
        let masterMatch = null;
        // Try code match first
        const codeInName = p.name.match(/^([A-Za-z0-9]{1,4}\d{3,5})\s+/);
        if (codeInName) {
            masterMatch = findProductByCode(codeInName[1]);
            if (masterMatch) p.name = masterMatch.name;
        }
        // Then fuzzy name match
        if (!masterMatch) {
            const prodResult = matchProduct(p.name);
            if (prodResult.match && prodResult.score >= 0.5) {
                masterMatch = prodResult.match;
                p.name = masterMatch.name;
            }
        }
        if (masterMatch && masterMatch.price > 0) {
            p.masterPrice = masterMatch.price;
            p.productCode = masterMatch.code;
            p.unit = masterMatch.unit || p.unit;
        }
        return p;
    });

    return {
        customerName,
        matchedCustomer,
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

// ============================================================
// UTILITY FUNCTIONS
// ============================================================

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

/**
 * Clean customer name — strip address, dashes, "Alamat:" etc.
 */
function cleanCustomerName(raw) {
    let name = cleanValue(raw);
    // Strip anything after em-dash, long-dash, or "Alamat"
    name = name.split(/\s*[—–-]{2,}\s*/)[0];
    name = name.split(/\s*—\s*/)[0];
    name = name.replace(/\s*[-–—]\s*Alamat\s*[:;]?.*/i, '');
    name = name.replace(/\s*Alamat\s*[:;]?.*/i, '');
    // Strip trailing Jl/Jln/Jalan address
    name = name.replace(/\s*(?:Jl|Jln|Jalan)\.?\s+.*/i, '');
    // Remove leading dashes
    name = name.replace(/^[—–\-\s]+/, '');
    return name.trim();
}

/**
 * Normalize any date string to DD-MMM-YYYY format
 * Examples: "27-Jan-2026" → "27-Jan-2026", "09/02/2026" → "09-Feb-2026",
 *           "2 Januari 2026" → "02-Jan-2026"
 */
const MONTH_MAP = {
    'januari': 'Jan', 'februari': 'Feb', 'maret': 'Mar', 'april': 'Apr',
    'mei': 'May', 'juni': 'Jun', 'juli': 'Jul', 'agustus': 'Aug',
    'september': 'Sep', 'oktober': 'Oct', 'november': 'Nov', 'desember': 'Dec',
    'jan': 'Jan', 'feb': 'Feb', 'mar': 'Mar', 'apr': 'Apr',
    'may': 'May', 'jun': 'Jun', 'jul': 'Jul', 'aug': 'Aug',
    'sep': 'Sep', 'oct': 'Oct', 'nov': 'Nov', 'dec': 'Dec',
    'agt': 'Aug', 'okt': 'Oct', 'des': 'Dec', 'nop': 'Nov', 'peb': 'Feb',
};

function normalizeDate(dateStr) {
    if (!dateStr) return '';

    // Try "DD Month YYYY" (e.g. "2 Januari 2026" or "27 Jan 2026")
    const fullMonth = dateStr.match(/(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})/);
    if (fullMonth) {
        const day = fullMonth[1].padStart(2, '0');
        const month = MONTH_MAP[fullMonth[2].toLowerCase()] || fullMonth[2].substring(0, 3);
        return `${day}-${month}-${fullMonth[3]}`;
    }

    // Try "DD-Mon-YYYY" (e.g. "27-Jan-2026") — already correct format
    const monName = dateStr.match(/(\d{1,2})[\-\/\.](\w{3,})[\-\/\.](\d{4})/);
    if (monName) {
        const day = monName[1].padStart(2, '0');
        const monthKey = monName[2].toLowerCase();
        const month = MONTH_MAP[monthKey] || monName[2].substring(0, 3);
        return `${day}-${month}-${monName[3]}`;
    }

    // Try "DD/MM/YYYY" or "DD-MM-YYYY" (numeric month)
    const numDate = dateStr.match(/(\d{1,2})[\-\/\.](\d{1,2})[\-\/\.](\d{4})/);
    if (numDate) {
        const day = numDate[1].padStart(2, '0');
        const monthNum = parseInt(numDate[2]);
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const month = months[monthNum - 1] || numDate[2];
        return `${day}-${month}-${numDate[3]}`;
    }

    return dateStr;
}
