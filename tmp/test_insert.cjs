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

async function checkRLS() {
    // Attempt to insert a dummy row into customer_targets using anon key, see error
    console.log("Attempting test insert...");

    // First, let's just query customers to get a valid cid
    const { data: c } = await supabase.from('customers').select('id').limit(1);
    if (!c || c.length === 0) {
        console.log("No customers found via anon key.");
        return;
    }

    const cid = c[0].id;
    console.log("Found customer ID:", cid);

    const { error: insErr1 } = await supabase.from('customer_targets').insert({
        customer_id: cid,
        grup_target: 'Test1',
        target_dus: 10,
        tahun: 2027
    });

    console.log("Insert Error without user_id:", insErr1);
}

checkRLS();
