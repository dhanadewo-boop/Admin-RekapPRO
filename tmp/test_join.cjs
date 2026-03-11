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

async function testSelectCustomerTargets() {
    const { data, error } = await supabase.from('customer_targets').select('*, customers(name)').limit(1);
    console.log("Joined data:", JSON.stringify(data, null, 2));
    console.log("Error:", error);
}

testSelectCustomerTargets();
