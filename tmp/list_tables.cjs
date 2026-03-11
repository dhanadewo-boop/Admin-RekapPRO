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

async function listTables() {
    // using postgres meta or by querying information_schema if possible via REST
    // Since REST limits us, let's just use REST rpc if available, or try common names
    console.log("Checking if rekap_invoices exists...");
    const { data: ri, error: e1 } = await supabase.from('rekap_invoice').select('id').limit(1);
    console.log("rekap_invoice err:", e1 ? e1.message : "Success");

    const { data: ri_plural, error: e2 } = await supabase.from('rekap_invoices').select('id').limit(1);
    console.log("rekap_invoices err:", e2 ? e2.message : "Success");

    const { data: dt, error: e3 } = await supabase.from('data_invoices').select('id').limit(1);
    console.log("data_invoices err:", e3 ? e3.message : "Success");
}

listTables();
