const fs = require('fs');
const xlsx = require('xlsx');

const filePath = 'C:\\Users\\KALATHAM\\Admin-RekapPRO\\data\\TARGET CUSTOMERS.xlsx';
const workbook = xlsx.readFile(filePath);

const rawDataToInsert = [];
workbook.SheetNames.forEach(sheetName => {
    const sheet = workbook.Sheets[sheetName];
    const jsonData = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: null });

    if (jsonData.length === 0) return;

    const headerRow = jsonData[0].map(h => String(h || '').trim().toUpperCase());
    const customerIdx = headerRow.findIndex(h => h === 'CUSTOMERS' || h === 'CUSTOMER' || h === 'NAMA CUSTOMER' || h === 'TOKO');
    const productIdx = headerRow.findIndex(h => h === 'PRODUK' || h === 'BARANG' || h === 'NAMA PRODUK');
    const targetIdx = headerRow.findIndex(h => h === 'TARGET' || h === 'JUMLAH' || h === 'QTY');

    if (customerIdx === -1 || productIdx === -1 || targetIdx === -1) return;

    for (let i = 1; i < jsonData.length; i++) {
        const row = jsonData[i] || [];
        if (!row.length) continue;

        const tokoName = String(row[customerIdx] || '').trim();
        const productName = String(row[productIdx] || '').trim();
        let targetValue = parseFloat(row[targetIdx]);

        if (!tokoName || !productName || isNaN(targetValue) || targetValue <= 0) continue;

        rawDataToInsert.push({ toko: tokoName, product: productName, target: targetValue });
    }
});

const combinations = new Map();
let duplicateFound = false;

rawDataToInsert.forEach((row, index) => {
    const normalizeName = (name) => {
        let n = name.toLowerCase();
        n = n.replace(/^(pt\\.*|cv\\.*|ud\\.*|tk\\.*|toko)\\s*/gi, '');
        n = n.replace(/[^a-z0-9]/g, '');
        return n;
    };

    const key = `${normalizeName(row.toko)}_${row.product.toLowerCase()}`;
    if (combinations.has(key)) {
        console.log(`Duplicate found! Row ${index} vs Row ${combinations.get(key).index}`);
        console.log(`- ${JSON.stringify(combinations.get(key).row)}`);
        console.log(`- ${JSON.stringify(row)}`);
        duplicateFound = true;
    } else {
        combinations.set(key, { row, index });
    }
});

if (!duplicateFound) {
    console.log("No duplicates found in the file itself.");
}
