const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const xlsx = require('xlsx');

const envPath = 'c:\\Users\\KALATHAM\\Admin-RekapPRO\\.env';
const envContent = fs.readFileSync(envPath, 'utf8');

let url = '';
let key = '';

envContent.split('\n').forEach(line => {
    if (line.startsWith('VITE_SUPABASE_URL=')) url = line.split('=')[1].trim();
    if (line.startsWith('VITE_SUPABASE_ANON_KEY=')) key = line.split('=')[1].trim();
});

const supabase = createClient(url, key);

async function seedTargets() {
    try {
        console.log("Fetching existing customers from Supabase...");
        const { data: customers, error: cErr } = await supabase.from('customers').select('id, name');
        if (cErr) throw cErr;

        console.log(`Found ${customers.length} customers.`);

        const filePath = 'C:\\Users\\KALATHAM\\Admin-RekapPRO\\data\\TARGET CUSTOMERS.xlsx';
        console.log(`Reading Excel file: ${filePath}`);

        const workbook = xlsx.readFile(filePath);
        const dataToInsert = [];
        const rawDataToInsert = [];

        workbook.SheetNames.forEach(sheetName => {
            const sheet = workbook.Sheets[sheetName];
            const jsonData = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: null });

            if (jsonData.length === 0) return;

            const headerRow = jsonData[0].map(h => String(h || '').trim().toUpperCase());
            const customerIdx = headerRow.findIndex(h => h === 'CUSTOMERS' || h === 'CUSTOMER' || h === 'NAMA CUSTOMER' || h === 'TOKO');
            const productIdx = headerRow.findIndex(h => h === 'PRODUK' || h === 'BARANG' || h === 'NAMA PRODUK');
            const targetIdx = headerRow.findIndex(h => h === 'TARGET' || h === 'JUMLAH' || h === 'QTY');

            if (customerIdx === -1 || productIdx === -1 || targetIdx === -1) {
                console.warn(`Sheet ${sheetName} missing columns. C:${customerIdx}, P:${productIdx}, T:${targetIdx}`);
                return;
            }

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

        console.log(`Extracted ${rawDataToInsert.length} raw rows from Excel.`);

        const normalizeName = (name) => {
            if (!name) return "";
            let n = name.toLowerCase();
            n = n.replace(/^(pt\\.*|cv\\.*|ud\\.*|tk\\.*|toko)\\s*/gi, '');
            n = n.replace(/[^a-z0-9]/g, '');
            return n;
        };

        rawDataToInsert.forEach(raw => {
            const rawName = raw.toko;
            const normalizedRaw = normalizeName(rawName);

            let customer = customers.find(c => c.name.trim().toLowerCase() === rawName.toLowerCase());
            if (!customer) customer = customers.find(c => normalizeName(c.name) === normalizedRaw);
            if (!customer && normalizedRaw.length >= 4) {
                customer = customers.find(c => {
                    const nc = normalizeName(c.name);
                    return nc.includes(normalizedRaw) || normalizedRaw.includes(nc);
                });
            }

            if (customer) {
                dataToInsert.push({
                    customer_id: customer.id,
                    grup_target: raw.product || 'Lainnya',
                    target_dus: raw.target || 0,
                    tahun: 2025 // DEFAULTING TO 2025 AS DISCUSSED
                });
            } else {
                console.log(`Warning: Could not match Excel customer '${rawName}' to database.`);
            }
        });

        console.log(`Prepared ${dataToInsert.length} mapped records for insertion.`);
        if (dataToInsert.length > 0) {
            // First, delete existing 2025 targets to avoid duplicates
            console.log("Clearing old 2025 targets...");
            await supabase.from('customer_targets').delete().eq('tahun', 2025);

            console.log("Inserting new targets...");
            const { error: insErr } = await supabase.from('customer_targets').insert(dataToInsert);
            if (insErr) throw insErr;
            console.log("Success! Data inserted.");
        }

    } catch (err) {
        console.error("Error:", err.message || err);
    }
}

seedTargets();
