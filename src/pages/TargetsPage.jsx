import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import * as XLSX from 'xlsx';

export default function TargetsPage() {
    const [file, setFile] = useState(null);
    const [loading, setLoading] = useState(false);
    const [customers, setCustomers] = useState([]);
    const [tahun, setTahun] = useState(2026);
    const [status, setStatus] = useState({ type: '', msg: '' });

    useEffect(() => {
        const fetchCustomers = async () => {
            const { data } = await supabase.from('customers').select('id, name');
            setCustomers(data || []);
        };
        fetchCustomers();
    }, []);

    const handleImport = async () => {
        if (!file) {
            alert("⚠️ File belum dipilih! Silakan pilih file Excel dulu.");
            return;
        }

        setLoading(true);
        setStatus({ type: 'info', msg: 'Sedang memproses data...' });

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const rawDataToInsert = [];

                workbook.SheetNames.forEach(sheetName => {
                    const worksheet = workbook.Sheets[sheetName];
                    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: null });

                    if (jsonData.length === 0) return;

                    // Detect column indices from header row (first row)
                    const headerRow = jsonData[0].map(h => String(h || '').trim().toUpperCase());

                    const customerIdx = headerRow.findIndex(h => h === 'CUSTOMERS' || h === 'CUSTOMER' || h === 'NAMA CUSTOMER' || h === 'TOKO');
                    const productIdx = headerRow.findIndex(h => h === 'PRODUK' || h === 'BARANG' || h === 'NAMA PRODUK');
                    const targetIdx = headerRow.findIndex(h => h === 'TARGET' || h === 'JUMLAH' || h === 'QTY');

                    // If we can't find the necessary columns, fallback or skip
                    if (customerIdx === -1 || productIdx === -1 || targetIdx === -1) {
                        console.warn(`Sheet ${sheetName} lost required columns: C:${customerIdx}, P:${productIdx}, T:${targetIdx}`);
                        return; // Skip sheet if missing core columns
                    }

                    // Loop through data rows starting from row 1 (skipping header)
                    for (let i = 1; i < jsonData.length; i++) {
                        const row = jsonData[i] || [];
                        if (!row || !row.length) continue;

                        const tokoName = String(row[customerIdx] || '').trim();
                        const productName = String(row[productIdx] || '').trim();
                        let targetValue = parseFloat(row[targetIdx]);

                        if (!tokoName || !productName || isNaN(targetValue) || targetValue <= 0) {
                            continue; // Skip invalid or empty rows
                        }

                        rawDataToInsert.push({
                            product: productName,
                            toko: tokoName,
                            target: targetValue
                        });
                    }
                });

                const normalizeName = (name) => {
                    if (!name) return "";
                    let n = name.toLowerCase();
                    n = n.replace(/^(pt\.*|cv\.*|ud\.*|tk\.*|toko)\s*/gi, '');
                    n = n.replace(/[^a-z0-9]/g, '');
                    return n;
                };

                console.log("Extracted Data pre-map:", rawDataToInsert.length);

                console.log("Extracted Data pre-map:", rawDataToInsert.length);

                // --- 1. Identify missing customers ---
                const missingNamesMap = new Map(); // stores normalizedName -> originalName
                const matchedCustomersMap = new Map();

                rawDataToInsert.forEach(raw => {
                    const rawName = raw.toko;
                    const normalizedRaw = normalizeName(rawName);
                    const lowerName = rawName.trim().toLowerCase();

                    let customer = customers.find(c => c.name.trim().toLowerCase() === lowerName);
                    if (!customer) customer = customers.find(c => normalizeName(c.name) === normalizedRaw);
                    if (!customer && normalizedRaw.length >= 4) {
                        customer = customers.find(c => {
                            const nc = normalizeName(c.name);
                            return nc.includes(normalizedRaw) || normalizedRaw.includes(nc);
                        });
                    }

                    if (customer) {
                        matchedCustomersMap.set(rawName, customer.id);
                    } else {
                        // Avoid pushing duplicates that only differ by casing
                        if (!missingNamesMap.has(lowerName)) {
                            missingNamesMap.set(lowerName, rawName);
                        }
                    }
                });

                // --- 2. Auto-insert missing customers ---
                let updatedCustomersList = [...customers];
                if (missingNamesMap.size > 0) {
                    setStatus({ type: 'info', msg: `Mendaftarkan ${missingNamesMap.size} customer baru ke database...` });
                    const newCustRows = Array.from(missingNamesMap.values()).map(name => ({ name }));

                    const { data: insertedCusts, error: insertErr } = await supabase
                        .from('customers')
                        .insert(newCustRows)
                        .select('id, name');

                    if (insertErr) throw insertErr;

                    if (insertedCusts) {
                        updatedCustomersList = [...updatedCustomersList, ...insertedCusts];
                        insertedCusts.forEach(c => matchedCustomersMap.set(c.name, c.id));
                    }
                }

                // --- 3. Map targets ---
                setStatus({ type: 'info', msg: `Mencatat target ke database...` });
                const dataToInsert = rawDataToInsert.map(raw => {
                    const rawName = raw.toko;
                    // Check if we matched it initially or after newly inserting it
                    let cid = matchedCustomersMap.get(rawName);

                    // Fallback search against the beautifully updated list just in case
                    if (!cid) {
                        const normalizedRaw = normalizeName(rawName);
                        let cstr = updatedCustomersList.find(c => c.name.trim().toLowerCase() === rawName.toLowerCase());
                        if (!cstr) cstr = updatedCustomersList.find(c => normalizeName(c.name) === normalizedRaw);
                        if (cstr) cid = cstr.id;
                    }

                    if (cid) {
                        return {
                            customer_id: cid,
                            grup_target: raw.product || 'Lainnya',
                            target_dus: raw.target || 0,
                            tahun: parseInt(tahun)
                        };
                    } else {
                        return null;
                    }
                }).filter(item => item !== null);

                if (dataToInsert.length === 0) throw new Error("Tidak ada nama toko yang cocok dengan Master Pelanggan.");

                setStatus({ type: 'info', msg: `Membersihkan data lama tahun ${tahun}...` });
                const { error: delErr } = await supabase
                    .from('customer_targets')
                    .delete()
                    .eq('tahun', parseInt(tahun));

                if (delErr) {
                    console.warn("Failed to delete old targets, might cause duplicate errors:", delErr);
                }

                setStatus({ type: 'info', msg: `Menyimpan ${dataToInsert.length} target ke database...` });
                const { error } = await supabase.from('customer_targets').insert(dataToInsert);
                if (error) throw error;

                setStatus({ type: 'success', msg: `✅ BERHASIL! ${dataToInsert.length} data target telah masuk ke database.` });
                setFile(null);
            } catch (err) {
                setStatus({ type: 'error', msg: '❌ ERROR: ' + err.message });
            } finally {
                setLoading(false);
            }
        };
        reader.readAsArrayBuffer(file);
    };

    return (
        <div style={{ padding: '40px', maxWidth: '600px', margin: '0 auto', fontFamily: 'sans-serif' }}>
            <h2 style={{ color: '#1e3a8a', marginBottom: '20px' }}>IMPORT DATA TARGET</h2>

            <div style={{ background: '#fff', padding: '25px', borderRadius: '12px', border: '1px solid #ddd', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>

                <div style={{ marginBottom: '15px' }}>
                    <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>TAHUN:</label>
                    <input
                        type="number"
                        value={tahun}
                        onChange={(e) => setTahun(e.target.value)}
                        style={{ width: '100%', padding: '10px', borderRadius: '5px', border: '1px solid #ccc' }}
                    />
                </div>

                <div style={{ marginBottom: '20px' }}>
                    <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>FILE EXCEL:</label>
                    <input
                        type="file"
                        accept=".xlsx, .xls"
                        onChange={(e) => setFile(e.target.files[0])}
                        style={{ width: '100%' }}
                    />
                </div>

                <button
                    onClick={handleImport}
                    disabled={loading}
                    style={{
                        width: '100%',
                        padding: '15px',
                        background: loading ? '#9ca3af' : '#2563eb',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        fontWeight: 'bold',
                        fontSize: '16px',
                        cursor: 'pointer'
                    }}
                >
                    {loading ? 'MENGIRIM DATA...' : 'KLIK DISINI UNTUK IMPORT'}
                </button>

                {status.msg && (
                    <div style={{
                        marginTop: '20px',
                        padding: '15px',
                        borderRadius: '8px',
                        background: status.type === 'success' ? '#dcfce7' : status.type === 'error' ? '#fee2e2' : '#dbeafe',
                        color: status.type === 'success' ? '#166534' : status.type === 'error' ? '#991b1b' : '#1e40af',
                        fontWeight: 'bold'
                    }}>
                        {status.msg}
                    </div>
                )}
            </div>
        </div>
    );
}