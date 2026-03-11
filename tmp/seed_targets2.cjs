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

async function seedCustomersAndTargets() {
    try {
        console.log("Fetching existing customers from Supabase...");
        const { data: existingCustomers, error: cErr } = await supabase.from('customers').select('id, name');
        if (cErr) throw cErr;

        let customersMap = new Map(existingCustomers.map(c => [c.name.trim().toLowerCase(), c.id]));

        const filePath = 'C:\\Users\\KALATHAM\\Admin-RekapPRO\\data\\TARGET CUSTOMERS.xlsx';
        const workbook = xlsx.readFile(filePath);
        const rawDataToInsert = [];

        workbook.SheetNames.forEach(sheetName => {
            const sheet = workbook.Sheets[sheetName];
            const jsonData = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: null });

            if (jsonData.length === 0) return;

            const headerRow = jsonData[0].map(h => String(h || '').trim().toUpperCase());
            const customerIdx = headerRow.findIndex(h => h === 'CUSTOMERS' || h === 'CUSTOMER' || h === 'NAMA CUSTOMER' || h === 'TOKO');
            const cityIdx = headerRow.findIndex(h => h === 'KOTA');
            const productIdx = headerRow.findIndex(h => h === 'PRODUK' || h === 'BARANG' || h === 'NAMA PRODUK');
            const targetIdx = headerRow.findIndex(h => h === 'TARGET' || h === 'JUMLAH' || h === 'QTY');

            if (customerIdx === -1 || productIdx === -1 || targetIdx === -1) return;

            for (let i = 1; i < jsonData.length; i++) {
                const row = jsonData[i] || [];
                if (!row.length) continue;

                const tokoName = String(row[customerIdx] || '').trim();
                const kota = cityIdx !== -1 ? String(row[cityIdx] || '').trim() : '';
                const productName = String(row[productIdx] || '').trim();
                let targetValue = parseFloat(row[targetIdx]);

                if (!tokoName || !productName || isNaN(targetValue) || targetValue <= 0) continue;

                rawDataToInsert.push({ toko: tokoName, kota, product: productName, target: targetValue });
            }
        });

        // Find unique customers to insert
        const uniqueCustomers = [];
        const seenCurrent = new Set();
        rawDataToInsert.forEach(raw => {
            const lowerName = raw.toko.toLowerCase();
            if (!customersMap.has(lowerName) && !seenCurrent.has(lowerName)) {
                uniqueCustomers.push({ name: raw.toko, city: raw.kota, total_amount: 0 });
                seenCurrent.add(lowerName);
            }
        });

        if (uniqueCustomers.length > 0) {
            console.log(`Inserting ${uniqueCustomers.length} missing customers into DB...`);
            const { data: newCusts, error: iErr } = await supabase.from('customers').insert(uniqueCustomers).select('id, name');
            if (iErr) throw iErr;

            newCusts.forEach(c => customersMap.set(c.name.trim().toLowerCase(), c.id));
        }

        const dataToInsert = [];
        rawDataToInsert.forEach(raw => {
            const cid = customersMap.get(raw.toko.toLowerCase());
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
            await supabase.from('customer_targets').delete().eq('tahun', 2025);
            const { error: insErr } = await supabase.from('customer_targets').insert(dataToInsert);
            if (insErr) throw insErr;
            console.log("Success! Data inserted.");
        }

    } catch (err) {
        console.error("Error:", err.message || err);
    }
}

seedCustomersAndTargets();
