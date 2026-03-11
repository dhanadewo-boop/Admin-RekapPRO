const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const xlsx = require('xlsx');

const envPath = 'c:\\Users\\KALATHAM\\Admin-RekapPRO\\.env';
const envContent = fs.readFileSync(envPath, 'utf8');

let url = '';
let serviceKey = '';

envContent.split('\n').forEach(line => {
    if (line.startsWith('VITE_SUPABASE_URL=')) url = line.split('=')[1].trim();
    if (line.startsWith('VITE_SUPABASE_SERVICE_KEY=')) serviceKey = line.split('=')[1].trim();
});

if (!serviceKey) {
    console.error("VITE_SUPABASE_SERVICE_KEY is missing from .env!");
    process.exit(1);
}

const supabaseAdmin = createClient(url, serviceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

async function seedCustomersAndTargets() {
    try {
        console.log("Fetching existing customers from Supabase (Admin)...");
        const { data: existingCustomers, error: cErr } = await supabaseAdmin.from('customers').select('id, name');
        if (cErr) throw cErr;

        let customersMap = new Map((existingCustomers || []).map(c => [c.name.trim().toLowerCase(), c.id]));

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

        // Find unique customers to insert
        const uniqueCustomersMap = new Map();

        rawDataToInsert.forEach(raw => {
            const rawName = raw.toko;

            const normalizeName = (name) => {
                if (!name) return "";
                let n = name.toLowerCase();
                n = n.replace(/^(pt\\.*|cv\\.*|ud\\.*|tk\\.*|toko)\\s*/gi, '');
                n = n.replace(/[^a-z0-9]/g, '');
                return n;
            };

            const normalizedRaw = normalizeName(rawName);
            const lowerName = rawName.trim().toLowerCase();

            let cMatch = existingCustomers.find(c => c.name.trim().toLowerCase() === lowerName);
            if (!cMatch) cMatch = existingCustomers.find(c => normalizeName(c.name) === normalizedRaw);
            if (!cMatch && normalizedRaw.length >= 4) {
                cMatch = existingCustomers.find(c => {
                    const nc = normalizeName(c.name);
                    return nc.includes(normalizedRaw) || normalizedRaw.includes(nc);
                });
            }

            if (!cMatch && !uniqueCustomersMap.has(lowerName)) {
                uniqueCustomersMap.set(lowerName, rawName);
            }
        });

        if (uniqueCustomersMap.size > 0) {
            console.log(`Bypassing RLS: Inserting ${uniqueCustomersMap.size} missing customers into DB...`);
            const newCustRows = Array.from(uniqueCustomersMap.values()).map(name => ({ name }));

            const { data: newCusts, error: iErr } = await supabaseAdmin.from('customers').insert(newCustRows).select('id, name');
            if (iErr) throw iErr;

            newCusts.forEach(c => customersMap.set(c.name.trim().toLowerCase(), c.id));
        }

        const dataToInsert = [];
        rawDataToInsert.forEach(raw => {
            const normalizeName = (name) => {
                let n = name.toLowerCase();
                n = n.replace(/^(pt\\.*|cv\\.*|ud\\.*|tk\\.*|toko)\\s*/gi, '');
                n = n.replace(/[^a-z0-9]/g, '');
                return n;
            };

            const rawName = raw.toko;
            const normalizedRaw = normalizeName(rawName);
            const lowerName = rawName.trim().toLowerCase();

            let cid = customersMap.get(lowerName);

            // Fallback match again in case it was a fuzzy match previously
            if (!cid) {
                for (const [key, value] of customersMap.entries()) {
                    if (normalizeName(key) === normalizedRaw ||
                        (normalizedRaw.length >= 4 && (normalizeName(key).includes(normalizedRaw) || normalizedRaw.includes(normalizeName(key))))) {
                        cid = value;
                        break;
                    }
                }
            }

            if (cid) {
                dataToInsert.push({
                    customer_id: cid,
                    grup_target: raw.product || 'Lainnya',
                    target_dus: raw.target || 0,
                    tahun: 2025
                });
            }
        });

        console.log(`Prepared ${dataToInsert.length} mapped target records for insertion.`);
        if (dataToInsert.length > 0) {
            console.log("Clearing old 2025 targets via Service Role...");
            await supabaseAdmin.from('customer_targets').delete().eq('tahun', 2025);

            console.log("Inserting new targets via Service Role...");
            const { error: insErr } = await supabaseAdmin.from('customer_targets').insert(dataToInsert);
            if (insErr) throw insErr;
            console.log("Success! Data inserted.");
        }

    } catch (err) {
        console.error("Error:", err.message || err);
    }
}

seedCustomersAndTargets();
