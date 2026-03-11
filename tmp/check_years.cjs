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

async function checkYears() {
    console.log("Fetching distinct years or latest invoice dates...");
    const { data: invs, error } = await supabase
        .from('invoices')
        .select(`invoice_date`)
        .order('invoice_date', { ascending: false })
        .limit(20);

    if (error) {
        console.error("Error:", error);
    } else {
        console.log(`Latest 20 invoice dates in DB:`);
        console.log(invs.map(i => i.invoice_date));
    }
}

checkYears();
