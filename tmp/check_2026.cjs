const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envPath = 'c:\\Users\\KALATHAM\\Admin-RekapPRO\\.env';
const envContent = fs.readFileSync(envPath, 'utf8');

let url = '';
let key = '';

envContent.split('\n').forEach(line => {
    if (line.startsWith('VITE_SUPABASE_URL=')) url = line.split('=')[1].trim();
    if (line.startsWith('VITE_SUPABASE_ANON_KEY=')) key = line.split('=')[1].trim();
});

const supabase = createClient(url, key);

async function checkData() {
    console.log("Fetching sample invoices for 2026...");
    const { data: invs, error } = await supabase
        .from('invoices')
        .select(`id, invoice_date`)
        .gte('invoice_date', '2026-01-01')
        .lte('invoice_date', '2026-12-31');

    if (error) {
        console.error("Error:", error);
    } else {
        console.log(`Found ${invs.length} invoices in 2026.`);
        if (invs.length > 0) {
            console.log("Sample 2026 Invoices:", invs.slice(0, 3));

            const ids = invs.map(i => i.id);
            const { data: items, error: itemErr } = await supabase
                .from('invoice_items')
                .select('invoice_id, product_name, subtotal')
                .in('invoice_id', ids);

            if (itemErr) {
                console.error("Item Error:", itemErr);
            } else {
                console.log(`Found ${items.length} items for 2026 invoices.`);
                console.log("Sample Items:", items.slice(0, 3));
            }
        }
    }
}

checkData();
