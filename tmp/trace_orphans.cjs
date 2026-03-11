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

async function findOrphans() {
    console.log("Fetching first 5 invoice_items...");
    const { data: items, error } = await supabase.from('invoice_items').select('*').limit(5);
    if (error) {
        console.error("Item fetch err:", error);
        return;
    }

    console.log("Items:");
    console.log(items);

    if (items && items.length > 0) {
        const id = items[0].invoice_id;
        console.log("Looking up invoice_id:", id);

        const { data: inv, error: invErr } = await supabase.from('invoices').select('*').eq('id', id);
        console.log("Result for invoice:", invErr ? invErr : inv);

        const { data: ri, error: riErr } = await supabase.from('rekap_invoice').select('*').eq('id', id);
        console.log("Result for rekap_invoice:", riErr ? riErr : ri);
    }
}

findOrphans();
