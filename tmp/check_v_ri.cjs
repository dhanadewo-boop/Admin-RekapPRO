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

async function checkView() {
    console.log("Fetching v_rekap_invoice...");
    const { data: ri, error: err } = await supabase.from('v_rekap_invoice').select('*').limit(3);
    if (err) {
        console.error("Error fetching from v_rekap_invoice:", err.message);
    } else {
        console.log("Success! Found rows:", ri.length);
        console.log(ri);
    }
}

checkView();
