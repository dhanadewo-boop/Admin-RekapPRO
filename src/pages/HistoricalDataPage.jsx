import { useState } from 'react';
import * as XLSX from 'xlsx';
import { supabase } from '../lib/supabase';
import { saveInvoice, upsertCustomer, upsertProduct, updateTargetProgress } from '../lib/db';
import { matchProduct } from '../lib/masterData';
import { Download, UploadCloud, AlertCircle, CheckCircle } from 'lucide-react';

export default function HistoricalDataPage() {
    const [file, setFile] = useState(null);
    const [loading, setLoading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [status, setStatus] = useState({ type: '', msg: '' });

    const downloadTemplate = () => {
        const headers = [
            'Tanggal (DD-Mon-YYYY)',
            'No. SPB',
            'Nama Customer',
            'Area/Kota',
            'Nama Barang',
            'Qty',
            'Harga Satuan',
            'Diskon %',
            'Subtotal'
        ];

        const ws = XLSX.utils.aoa_to_sheet([headers]);
        ws['!cols'] = [
            { wch: 20 }, { wch: 15 }, { wch: 30 }, { wch: 15 },
            { wch: 25 }, { wch: 8 }, { wch: 15 }, { wch: 10 }, { wch: 15 }
        ];

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Template Historis');
        XLSX.writeFile(wb, 'Template_Load_Historis.xlsx');
    };

    const handleUpload = async () => {
        if (!file) {
            setStatus({ type: 'error', msg: 'Pilih file Excel terlebih dahulu.' });
            return;
        }

        setLoading(true);
        setStatus({ type: 'info', msg: 'Membaca file Excel...' });
        setProgress(0);

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const sheetNames = workbook.SheetNames;

                let invoicesList = [];

                // Detect if it's the legacy REKAP DAN KONTRIBUSI file which has years as sheet names
                const isLegacyRekap = sheetNames.some(name => ['2023', '2024', '2025'].includes(name));

                if (isLegacyRekap) {
                    setStatus({ type: 'info', msg: 'Format Rekap Legacy terdeteksi. Merangkum data bulanan...' });

                    sheetNames.forEach(sheetName => {
                        const year = parseInt(sheetName);
                        if (isNaN(year)) return;

                        const worksheet = workbook.Sheets[sheetName];
                        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: null });

                        for (let i = 1; i < jsonData.length; i++) {
                            const row = jsonData[i] || [];
                            if (!row || !row[0]) continue;

                            const productName = String(row[0]).trim();
                            if (productName === '' || productName.toUpperCase().includes('PUPUK DAUN')) continue;

                            for (let m = 0; m < 12; m++) {
                                const valIndex = 7 + (m * 4);
                                if (row.length > valIndex && !isNaN(parseFloat(row[valIndex]))) {
                                    const val = parseFloat(row[valIndex]);
                                    if (val > 0) {
                                        const invDate = `${year}-${String(m + 1).padStart(2, '0')}-28`;
                                        const cleanCode = productName.substring(0, 5).replace(/[^a-zA-Z]/g, '').toUpperCase();
                                        const invoiceNumber = `HIST-${year}${String(m + 1).padStart(2, '0')}-${cleanCode}-${Math.floor(Math.random() * 1000)}`;

                                        invoicesList.push({
                                            customerName: 'DATA HISTORIS (SUMMARY)',
                                            city: 'Historis',
                                            invoiceNumber: invoiceNumber,
                                            invoiceDate: invDate,
                                            products: [{
                                                name: productName,
                                                qty: 1,
                                                unit: 'aggregate',
                                                unitPrice: val,
                                                discountPercent: 0,
                                                subtotal: val
                                            }],
                                            totalAmount: val,
                                            source: 'legacy_rekap_import'
                                        });
                                    }
                                }
                            }
                        }
                    });
                } else {
                    const jsonData = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { raw: false });
                    const invoicesMap = {};

                    jsonData.forEach(row => {
                        const rowKeys = Object.keys(row);
                        const getDate = () => row[rowKeys.find(k => k.toLowerCase().includes('tanggal'))];
                        const getSpb = () => row[rowKeys.find(k => k.toLowerCase().includes('spb'))];
                        const getCust = () => row[rowKeys.find(k => k.toLowerCase().includes('customer'))];
                        const getCity = () => row[rowKeys.find(k => k.toLowerCase().includes('area') || k.toLowerCase().includes('kota'))];
                        const getProd = () => row[rowKeys.find(k => k.toLowerCase().includes('barang'))];
                        const getQty = () => {
                            const val = row[rowKeys.find(k => k?.toLowerCase() === 'qty')];
                            if (val === undefined || val === null) return 0;
                            return parseFloat(val.toString().replace(/[^0-9.-]+/g, '')) || 0;
                        };
                        const getPrice = () => {
                            const val = row[rowKeys.find(k => k?.toLowerCase().includes('harga'))];
                            if (val === undefined || val === null) return 0;
                            return parseFloat(val.toString().replace(/[^0-9.-]+/g, '')) || 0;
                        };
                        const getDisc = () => {
                            const val = row[rowKeys.find(k => k?.toLowerCase().includes('diskon'))];
                            if (val === undefined || val === null) return 0;
                            return parseFloat(val.toString().replace(/[^0-9.-]+/g, '')) || 0;
                        };
                        const getSub = () => {
                            const val = row[rowKeys.find(k => k?.toLowerCase().includes('subtotal'))];
                            if (val === undefined || val === null) return 0;
                            return parseFloat(val.toString().replace(/[^0-9.-]+/g, '')) || 0;
                        };

                        const spb = getSpb()?.toString().trim();
                        if (!spb) return;

                        if (!invoicesMap[spb]) {
                            invoicesMap[spb] = {
                                customerName: getCust()?.toString().trim() || 'Unknown',
                                city: getCity()?.toString().trim() || '',
                                invoiceNumber: spb,
                                invoiceDate: getDate()?.toString().trim() || '',
                                products: [],
                                totalAmount: 0,
                                source: 'historical_import'
                            };
                        }

                        const parsedName = getProd()?.toString().trim() || '';
                        const parsedQty = getQty();
                        const parsedDisc = getDisc();
                        let finalPrice = getPrice();
                        let finalSub = getSub();

                        // Cross-reference with masterData.js for accurate prices
                        const matched = matchProduct(parsedName, 0.4);
                        if (matched?.match?.price > 0) {
                            finalPrice = matched.match.price;
                            // Recalculate subtotal based on official price
                            finalSub = finalPrice * parsedQty * (1 - (parsedDisc / 100));
                        }

                        invoicesMap[spb].products.push({
                            name: parsedName,
                            qty: parsedQty,
                            unit: 'dus',
                            unitPrice: finalPrice,
                            discountPercent: parsedDisc,
                            subtotal: finalSub
                        });
                        invoicesMap[spb].totalAmount += finalSub;
                    });

                    invoicesList = Object.values(invoicesMap);
                }

                if (invoicesList.length === 0) {
                    throw new Error("Tidak ada data valid yang ditemukan dalam file.");
                }

                setStatus({ type: 'info', msg: `Menyimpan ${invoicesList.length} invoice ke database...` });

                let successCount = 0;
                for (let i = 0; i < invoicesList.length; i++) {
                    const inv = invoicesList[i];
                    try {
                        // We use the same engine logic without images
                        await saveInvoice(inv);
                        await upsertCustomer(inv.customerName, inv.totalAmount);
                        for (const product of inv.products) {
                            await upsertProduct(product.name, product.qty, product.unitPrice);
                        }
                        await updateTargetProgress(inv.customerName, inv.totalAmount);

                        successCount++;
                    } catch (err) {
                        console.error(`Gagal import SPB ${inv.invoiceNumber}:`, err);
                    }
                    setProgress(Math.round(((i + 1) / invoicesList.length) * 100));
                }

                setStatus({ type: 'success', msg: `Berhasil import ${successCount} dari ${invoicesList.length} invoice!` });
                setFile(null);
            } catch (err) {
                console.error(err);
                setStatus({ type: 'error', msg: 'Gagal memproses file: ' + err.message });
            } finally {
                setLoading(false);
            }
        };
        reader.readAsArrayBuffer(file);
    };

    return (
        <div className="animate-fade-in">
            <div className="page-header">
                <h1>Strategi Data Historis</h1>
                <p>Import data penjualan dari tahun 2013-2025 untuk keperluan analitik tren jangka panjang.</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 'var(--space-lg)' }}>
                {/* Step 1: Mapping Template */}
                <div className="glass-card">
                    <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span className="badge badge-blue" style={{ fontSize: '1rem', width: 24, height: 24, padding: 0, justifyContent: 'center' }}>1</span>
                        Mapping Template
                    </h2>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: 20 }}>
                        Anda dapat mengunggah file Invoice standar (melalui template ini), atau file REKAP DAN KONTRIBUSI legacy.
                        Sistem akan secara otomatis mengenali format file Anda.
                    </p>
                    <button className="btn btn-secondary" onClick={downloadTemplate} style={{ width: '100%', justifyContent: 'center' }}>
                        <Download size={18} /> Download Template Excel
                    </button>

                    <div style={{ marginTop: 20, padding: 12, background: 'var(--bg-glass)', borderRadius: 'var(--radius-sm)', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        <strong>Catatan Cleansing:</strong> Pastikan singkatan nama customer dan produk persis sama dengan Master Data agar kalkulasi target berjalan sempurna.
                    </div>
                </div>

                {/* Step 2: Bulk Upload */}
                <div className="glass-card">
                    <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span className="badge badge-emerald" style={{ fontSize: '1rem', width: 24, height: 24, padding: 0, justifyContent: 'center' }}>2</span>
                        Bulk Upload
                    </h2>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: 20 }}>
                        Unggah file Template Historis ATAU file mentah "REKAP DAN KONTRIBUSI PRODUK". Sistem cerdas kami akan mengekstrak otomatis.
                    </p>

                    <div style={{ marginBottom: 16 }}>
                        <input
                            type="file"
                            accept=".xlsx, .xls"
                            onChange={(e) => setFile(e.target.files[0])}
                            style={{ width: '100%', padding: '10px' }}
                            disabled={loading}
                        />
                    </div>

                    <button
                        className="btn btn-success"
                        onClick={handleUpload}
                        style={{ width: '100%', justifyContent: 'center' }}
                        disabled={loading || !file}
                    >
                        {loading ? 'Memproses Data...' : <><UploadCloud size={18} /> Upload ke Database</>}
                    </button>

                    {loading && (
                        <div style={{ marginTop: 16 }}>
                            <div style={{ width: '100%', height: 6, background: 'var(--border-glass)', borderRadius: 3, overflow: 'hidden' }}>
                                <div style={{ height: '100%', background: 'var(--accent-emerald)', width: `${progress}%`, transition: 'width 0.2s' }}></div>
                            </div>
                            <p style={{ textAlign: 'center', fontSize: '0.75rem', marginTop: 4, color: 'var(--text-muted)' }}>{progress}% Selesai</p>
                        </div>
                    )}

                    {status.msg && !loading && (
                        <div style={{
                            marginTop: 16, padding: '12px', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem', fontWeight: 500,
                            display: 'flex', alignItems: 'center', gap: 8,
                            background: status.type === 'success' ? 'var(--accent-emerald-glow)' : status.type === 'error' ? 'var(--accent-rose-glow)' : 'var(--accent-blue-glow)',
                            color: status.type === 'success' ? 'var(--accent-emerald)' : status.type === 'error' ? 'var(--accent-rose)' : 'var(--accent-blue)',
                        }}>
                            {status.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
                            {status.msg}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
