/**
 * Master Product List — from "Master Harga SPB 01 OKTOBER 2025.xls"
 * Used for OCR fuzzy matching, auto-suggest, and price auto-fill
 */
const masterProducts = [
    { code: "A1A0111", shortcode: "O6 100", name: "Osmocote 6-13-25, 100 gr", unit: "dus", price: 799200, discountOptions: [0, 5], defaultDiscount: 5 },
    { code: "A1A0121", shortcode: "O6 500", name: "Osmocote 6-13-25, 500 gr", unit: "dus", price: 1605060, discountOptions: [0, 5], defaultDiscount: 5 },
    { code: "A1A0201", shortcode: "O13 100", name: "Osmocote 13-13-13, 100 gr", unit: "dus", price: 821400, discountOptions: [0, 5], defaultDiscount: 5 },
    { code: "A1A0202", shortcode: "O13 500", name: "Osmocote 13-13-13, 500 gr", unit: "dus", price: 1704960, discountOptions: [0, 5], defaultDiscount: 5 },
    { code: "A1A0311", shortcode: "O17 100", name: "Osmocote 17-11-10, 100 gr", unit: "dus", price: 821400, discountOptions: [0, 5], defaultDiscount: 5 },
    { code: "A1A0321", shortcode: "O17 500", name: "Osmocote 17-11-10, 500 gr", unit: "dus", price: 1704960, discountOptions: [0, 5], defaultDiscount: 5 },
    { code: "A1B0204", shortcode: "MX 200", name: "Gandapan Maxima, 40 x 200 gr", unit: "dus", price: 710400, discountOptions: [0], defaultDiscount: 0 },
    { code: "A1B0305", shortcode: "RG 250", name: "Gandapan Reginae, 40 x 250 gr", unit: "dus", price: 1287600, discountOptions: [0], defaultDiscount: 0 },
    { code: "A1B0401", shortcode: "SB 250", name: "Gandapan Sublima, 40 x 250 gr", unit: "dus", price: 976800, discountOptions: [0], defaultDiscount: 0 },
    { code: "A1B0501", shortcode: "B 100", name: "Gandasil Bunga, 144 x 100 gr", unit: "dus", price: 1330668, discountOptions: [0, 4, 5, 6], defaultDiscount: 4 },
    { code: "A1B0502", shortcode: "B 500", name: "Gandasil Bunga, 24 x 500 gr", unit: "dus", price: 1038960, discountOptions: [0, 4, 5, 6], defaultDiscount: 4 },
    { code: "A1B0601", shortcode: "D 100", name: "Gandasil Daun, 144 x 100 gr", unit: "dus", price: 1198800, discountOptions: [0, 4, 5, 6], defaultDiscount: 4 },
    { code: "A1B0602", shortcode: "D 500", name: "Gandasil Daun, 24 x 500 gr", unit: "dus", price: 932400, discountOptions: [0, 4, 5, 6], defaultDiscount: 4 },
    { code: "A1B0901", shortcode: "MZ 100", name: "Mikrofid Zn, 50 x 100 g", unit: "dus", price: 0, discountOptions: [0], defaultDiscount: 0 },
    { code: null, shortcode: "GS 500", name: "Gandastar ( Mix ), 20 x 500 cc", unit: "dus", price: 399600, discountOptions: [0], defaultDiscount: 0 },
    { code: null, shortcode: "GS 1000", name: "Gandastar ( Mix ), 12 x 1000 cc", unit: "dus", price: 452880, discountOptions: [0], defaultDiscount: 0 },
    { code: "A1C0102", shortcode: "DK 500", name: "Dekorgan Plus, 24 x 500 cc", unit: "dus", price: 1043400, discountOptions: [0], defaultDiscount: 0 },
    { code: "A1C0103", shortcode: "DK 1000", name: "Dekorgan Plus, 12 x 1000 cc", unit: "dus", price: 985680, discountOptions: [0], defaultDiscount: 0 },
    { code: "A1C0207", shortcode: "MF 500", name: "Mastofol, 20 x 500 cc", unit: "dus", price: 1420800, discountOptions: [0, 5], defaultDiscount: 5 },
    { code: "A1C0208", shortcode: "MF 1000", name: "Mastofol, 12 x 1.000 cc", unit: "dus", price: 1665000, discountOptions: [0, 5], defaultDiscount: 5 },
    { code: "A2D0201", shortcode: "DG 1", name: "Dekamon 1,2 G, 10 x 1 kg", unit: "dus", price: 777000, discountOptions: [0], defaultDiscount: 0 },
    { code: "A2D0214", shortcode: "DL 100", name: "Dekamon 22,43 L, 50 x 100 cc", unit: "dus", price: 985680, discountOptions: [0, 3, 4], defaultDiscount: 3 },
    { code: "A2D0211", shortcode: "DL 500", name: "Dekamon 22,43 L, 20 x 500 cc", unit: "dus", price: 1287600, discountOptions: [0, 3, 4], defaultDiscount: 3 },
    { code: "A2D0212", shortcode: "DL 1000", name: "Dekamon 22,43 L, 12 x 1 L", unit: "dus", price: 1518480, discountOptions: [0, 3, 4], defaultDiscount: 3 },
    { code: "A3E0108", shortcode: "DC 500", name: "Domacide 400 EC, 20 x 500 cc", unit: "dus", price: 2200000, discountOptions: [0, 6], defaultDiscount: 6 },
    { code: "A3E0303", shortcode: "DP 100", name: "Dekapirim 400 SC, 50 x 100 cc", unit: "dus", price: 4884000, discountOptions: [0, 5], defaultDiscount: 5 },
    { code: "A3E0301", shortcode: "DP 500", name: "Dekapirim 400 SC, 20 x 500 cc", unit: "dus", price: 9146400, discountOptions: [0, 5], defaultDiscount: 5 },
    { code: "A3E0302", shortcode: "DP 1000", name: "Dekapirim 400 SC, 12 x 1000 cc", unit: "dus", price: 10642680, discountOptions: [0, 5], defaultDiscount: 5 },
    { code: "A3E0401", shortcode: "DT 50", name: "Dektin 30 WG, 50 x 50 gr", unit: "dus", price: 3885000, discountOptions: [0, 5], defaultDiscount: 5 },
    { code: "A3E0402", shortcode: "DT 200", name: "Dektin 30 WG, 20 x 200 gr", unit: "dus", price: 5727600, discountOptions: [0, 5], defaultDiscount: 5 },
    { code: "A3E0403", shortcode: "DT 500", name: "Dektin 30 WG, 12 x 500 gr", unit: "dus", price: 8178480, discountOptions: [0, 5], defaultDiscount: 5 },
    { code: "A4F0202", shortcode: "MA 100", name: "Masalgin 50 WP, 24 x 100 gr", unit: "dus", price: 1145520, discountOptions: [0, 2], defaultDiscount: 2 },
    { code: "A4F0210", shortcode: "MA 200", name: "Masalgin 50 WP, 24 x 200 gr", unit: "dus", price: 2264400, discountOptions: [0, 2], defaultDiscount: 2 },
    { code: "A4F0204", shortcode: "MA 500", name: "Masalgin 50 WP, 12 x 500 gr", unit: "dus", price: 2384280, discountOptions: [0, 2], defaultDiscount: 2 },
    { code: "A4F0306", shortcode: "VL 50", name: "Velimek 52,5 WP, 50 x 50 gr", unit: "dus", price: 4218000, discountOptions: [0, 5], defaultDiscount: 5 },
    { code: "A4F0307", shortcode: "VL 200", name: "Velimek 52,5 WP, 20 x 200 gr", unit: "dus", price: 6549000, discountOptions: [0, 5], defaultDiscount: 5 },
    { code: "A4F0308", shortcode: "VL 500", name: "Velimek 52,5 WP, 12 x 500 gr", unit: "dus", price: 9630360, discountOptions: [0, 5], defaultDiscount: 5 },
    { code: "A70101", shortcode: "DB 100", name: "Dekabond, 50 x 100 cc", unit: "dus", price: 1276500, discountOptions: [0], defaultDiscount: 0 },
    { code: "A70102", shortcode: "DB 500", name: "Dekabond, 20 x 500 cc", unit: "dus", price: 2220000, discountOptions: [0], defaultDiscount: 0 },
];

/**
 * Master Customer List — from Supabase customers_rows.csv
 * Used for OCR fuzzy matching and auto-suggest
 */
const masterCustomers = [
    { id: "02e91f02-377f-4f7b-b490-23761728691d", name: "PT. Anugerah Agro Mandiri", area: "AREA 4", shortcode: "AAM" },
    { id: "096eae8f-786e-43ed-8822-d3b19d690c42", name: "CV. Sarana Cipta Agro", area: "AREA 4", shortcode: "SCA" },
    { id: "0ac29f44-f097-406c-b180-4efc7cf3fb71", name: "PT. Sumber Makmur Agroindo", area: "AREA 1", shortcode: "SMA" },
    { id: "14f24368-e1e6-49bc-9815-2525684bd31f", name: "PT. Sentra Agronusa Bakti", area: "AREA 1", shortcode: "SAB" },
    { id: "1a611436-9b52-48ba-b21e-67727e97e1c6", name: "PT. Sumber Makmur Agrikultir Ind", area: "AREA 5", shortcode: "SMAI" },
    { id: "3ce54fd1-1adb-4428-9b2a-4689a6c570c8", name: "PT. Tunas Abadi Indoagro", area: "AREA 4", shortcode: "TAI" },
    { id: "42f0b81f-5d38-4918-9897-aa36c9b3c1d8", name: "CV. Hani", area: "AREA 2", shortcode: "HANI" },
    { id: "4ae52a83-95bc-4fe7-a970-4a3cd7e7e93b", name: "PT. Aksestani Agrotech Indonesia", area: "AREA 2", shortcode: "AAI" },
    { id: "4e0ce9b2-0d73-4af0-9fd1-b9565fb5acaa", name: "CV. Hikmah Agung", area: "AREA 1", shortcode: "HA" },
    { id: "5cf4bff3-5e00-48ab-aefc-08c8cc8e627d", name: "PT. Karisma Indoagro Universal", area: "AREA 3", shortcode: "KIU" },
    { id: "6791b2a3-c7aa-4a62-9e55-146b595bebb2", name: "Mitra Flora Nusantara", area: "AREA 5", shortcode: "MFN" },
    { id: "72c7d1ee-4e5d-4101-8504-26fa8cb7782d", name: "PT. Tani Sejati Mandiri", area: "AREA 5", shortcode: "TSM" },
    { id: "90f258d0-2906-4186-b717-119374d4722d", name: "Agro Prima", area: "AREA 4", shortcode: "AP" },
    { id: "c1753c44-7420-4961-aa4d-ea5590522c6e", name: "CV. Subur Makmur", area: "AREA 2", shortcode: "SM" },
    { id: "e78a0a78-9f73-4035-8472-950b5b0d620b", name: "PT. Anugrah Tani Sejati", area: "AREA 1", shortcode: "ATS" },
    { id: "fbdaef3b-5d8d-4ae3-8d52-4b380819ccc3", name: "PT. Mahatma Agro", area: "AREA 2", shortcode: "MA" },
];

// ============================================================
// FUZZY MATCHING
// ============================================================

/**
 * Simple Levenshtein distance between two strings
 */
function levenshtein(a, b) {
    const m = a.length, n = b.length;
    const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;
    for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
            dp[i][j] = a[i - 1] === b[j - 1]
                ? dp[i - 1][j - 1]
                : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
        }
    }
    return dp[m][n];
}

/**
 * Calculate similarity score between two strings (0 to 1, higher = more similar)
 */
function similarity(a, b) {
    if (!a || !b) return 0;
    const al = a.toLowerCase().trim();
    const bl = b.toLowerCase().trim();
    if (al === bl) return 1;
    const maxLen = Math.max(al.length, bl.length);
    if (maxLen === 0) return 1;
    return 1 - levenshtein(al, bl) / maxLen;
}

/**
 * Find the best matching customer from the master list
 * @param {string} ocrName - Customer name extracted by OCR
 * @param {number} threshold - Minimum similarity score to consider a match (0-1)
 * @returns {{ match: object|null, score: number, suggestions: object[] }}
 */
export function matchCustomer(ocrName, threshold = 0.5) {
    if (!ocrName) return { match: null, score: 0, suggestions: [] };

    const scored = masterCustomers
        .map(c => ({ ...c, score: similarity(ocrName, c.name) }))
        .sort((a, b) => b.score - a.score);

    return {
        match: scored[0]?.score >= threshold ? scored[0] : null,
        score: scored[0]?.score || 0,
        suggestions: scored.slice(0, 5) // Top 5 suggestions
    };
}

/**
 * Find the best matching product from the master list by name or by code
 * @param {string} ocrText - Product name or code extracted by OCR
 * @param {number} threshold - Minimum similarity score
 * @returns {{ match: object|null, score: number, suggestions: object[] }}
 */
export function matchProduct(ocrText, threshold = 0.4) {
    if (!ocrText) return { match: null, score: 0, suggestions: [] };

    const text = ocrText.trim();

    // First try exact code match
    const codeMatch = masterProducts.find(p =>
        p.code && p.code.toLowerCase() === text.toLowerCase()
    );
    if (codeMatch) {
        return { match: { ...codeMatch, score: 1 }, score: 1, suggestions: [{ ...codeMatch, score: 1 }] };
    }

    // Fuzzy match by name — compare against the base product name (before comma)
    const scored = masterProducts
        .map(p => {
            // Full name similarity
            const fullScore = similarity(text, p.name);
            // Also check similarity against just the product name part (before the comma/size)
            const baseName = p.name.split(',')[0].trim();
            const baseScore = similarity(text.split(',')[0].trim(), baseName);
            const bestScore = Math.max(fullScore, baseScore);
            return { ...p, score: bestScore };
        })
        .sort((a, b) => b.score - a.score);

    return {
        match: scored[0]?.score >= threshold ? scored[0] : null,
        score: scored[0]?.score || 0,
        suggestions: scored.slice(0, 5)
    };
}

/**
 * Find a product by its exact code
 */
export function findProductByCode(code) {
    if (!code) return null;
    return masterProducts.find(p => p.code && p.code.toUpperCase() === code.toUpperCase()) || null;
}

/**
 * Get all customers for autocomplete
 */
export function getAllCustomers() {
    return [...masterCustomers];
}

/**
 * Get all products for autocomplete
 */
export function getAllProducts() {
    return [...masterProducts];
}

/**
 * Filter customers by search text (for autocomplete)
 */
export function searchCustomers(query) {
    if (!query || query.length < 1) return masterCustomers;
    const q = query.toLowerCase();
    return masterCustomers
        .filter(c => c.name.toLowerCase().includes(q) || c.area.toLowerCase().includes(q))
        .sort((a, b) => {
            // Prioritize starts-with matches
            const aStarts = a.name.toLowerCase().startsWith(q) ? 1 : 0;
            const bStarts = b.name.toLowerCase().startsWith(q) ? 1 : 0;
            return bStarts - aStarts;
        });
}

/**
 * Filter products by search text (for autocomplete)
 */
export function searchProducts(query) {
    if (!query || query.length < 1) return masterProducts;
    const q = query.toLowerCase();
    return masterProducts
        .filter(p =>
            p.name.toLowerCase().includes(q) ||
            (p.code && p.code.toLowerCase().includes(q))
        )
        .sort((a, b) => {
            const aStarts = a.name.toLowerCase().startsWith(q) ? 1 : 0;
            const bStarts = b.name.toLowerCase().startsWith(q) ? 1 : 0;
            return bStarts - aStarts;
        });
}
