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

async function checkCount() {
    const { count: invCount, error: err1 } = await supabase.from('invoices').select('*', { count: 'exact', head: true });
    const { count: itemCount, error: err2 } = await supabase.from('invoice_items').select('*', { count: 'exact', head: true });
    const { count: custCount, error: err3 } = await supabase.from('customers').select('*', { count: 'exact', head: true });

    console.log(`Invoices count: ${invCount}`);
    console.log(`InvoiceItems count: ${itemCount}`);
    console.log(`Customers count: ${custCount}`);
}

checkCount();
