import { useEffect, useState, Fragment } from 'react';
import { supabase } from "../lib/supabase";
import { getAllProducts, matchProduct } from "../lib/masterData";
import * as XLSX from 'xlsx';

export default function RekapTarget() {
    const [tabAktif, setTabAktif] = useState('global');
    const [dataBulananMatrix, setDataBulananMatrix] = useState({});
    const [loading, setLoading] = useState(true);

    const tahunAktif = 2026;
    const TARGET_TOTAL = 95000000000;
    const namaBulan = ["JANUARI", "FEBRUARI", "MARET", "APRIL", "MEI", "JUNI", "JULI", "AGUSTUS", "SEPTEMBER", "OKTOBER", "NOVEMBER", "DESEMBER"];
    const namaBulanPendek = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

    // ══════════════════════════════════════════
    // PRODUCT GROUPING ORDER for REKAP BULANAN
    // ══════════════════════════════════════════
    const productGroups = [
        {
            kategori: 'Pupuk', label: 'PUPUK',
            subgroups: [
                { items: ["Osmocote 6-13-25, 100 gr", "Osmocote 6-13-25, 500 gr", "Osmocote 17-11-10, 100 gr", "Osmocote 17-11-10, 500 gr", "Osmocote 13-13-13, 100 gr", "Osmocote 13-13-13, 500 gr"] },
                { items: ["Gandapan Maxima, 40 x 200 gr", "Gandapan Reginae, 40 x 250 gr", "Gandapan Sublima, 40 x 250 gr", "Gandasil Bunga, 144 x 100 gr", "Gandasil Bunga, 24 x 500 gr", "Gandasil Daun, 144 x 100 gr", "Gandasil Daun, 24 x 500 gr", "Mikrofid Zn, 50 x 100 g"] },
                { items: ["Dekorgan Plus, 24 x 500 cc", "Dekorgan Plus, 12 x 1000 cc", "Gandastar ( Mix ), 20 x 500 cc", "Gandastar ( Mix ), 12 x 1000 cc", "Mastofol, 20 x 500 cc", "Mastofol, 12 x 1.000 cc"] },
            ]
        },
        {
            kategori: 'Pestisida', label: 'PESTISIDA',
            subgroups: [
                { items: ["Dekamon 1,2 G, 10 x 1 kg", "Dekamon 22,43 L, 50 x 100 cc", "Dekamon 22,43 L, 20 x 500 cc", "Dekamon 22,43 L, 12 x 1 L"] },
                { items: ["Dimacide 400 EC, 20 x 500 cc", "Dekapirim 400 SC, 50 x 100 cc", "Dekapirim 400 SC, 20 x 500 cc", "Dekapirim 400 SC, 12 x 1000 cc", "Dektin 30 WG, 50 x 50 gr", "Dektin 30 WG, 20 x 200 gr", "Dektin 30 WG, 12 x 500 gr"] },
                { items: ["Masalgin 50 WP, 24 x 100 gr", "Masalgin 50 WP, 24 x 200 gr", "Masalgin 50 WP, 12 x 500 gr", "Velimek 52,5 WP, 50 x 50 gr", "Velimek 52,5 WP, 20 x 200 gr", "Velimek 52,5 WP, 12 x 500 gr"] },
                { items: ["Dekabond, 50 x 100 cc", "Dekabond, 20 x 500 cc"] },
            ]
        },
    ];

    // ══════════════════════════════════════════════════
    // KONTRIBUSI GLOBAL — Granular per-family grouping
    // ══════════════════════════════════════════════════
    const kontribusiGroups = [
        { label: "Osmocote", kategori: "Pupuk", items: ["Osmocote 6-13-25, 100 gr", "Osmocote 6-13-25, 500 gr", "Osmocote 17-11-10, 100 gr", "Osmocote 17-11-10, 500 gr", "Osmocote 13-13-13, 100 gr", "Osmocote 13-13-13, 500 gr"] },
        { label: "Gandapan", kategori: "Pupuk", items: ["Gandapan Maxima, 40 x 200 gr", "Gandapan Reginae, 40 x 250 gr", "Gandapan Sublima, 40 x 250 gr"] },
        { label: "Gandasil", kategori: "Pupuk", items: ["Gandasil Bunga, 144 x 100 gr", "Gandasil Bunga, 24 x 500 gr", "Gandasil Daun, 144 x 100 gr", "Gandasil Daun, 24 x 500 gr"] },
        { label: "Mikrofid", kategori: "Pupuk", items: ["Mikrofid Zn, 50 x 100 g"] },
        { label: "Dekorgan", kategori: "Pupuk", items: ["Dekorgan Plus, 24 x 500 cc", "Dekorgan Plus, 12 x 1000 cc"] },
        { label: "Gandastar", kategori: "Pupuk", items: ["Gandastar ( Mix ), 20 x 500 cc", "Gandastar ( Mix ), 12 x 1000 cc"] },
        { label: "Mastofol", kategori: "Pupuk", items: ["Mastofol, 20 x 500 cc", "Mastofol, 12 x 1.000 cc"] },
        { label: "Dekamon 1,2 G", kategori: "Pestisida", items: ["Dekamon 1,2 G, 10 x 1 kg"] },
        { label: "Dekamon 22,43 L", kategori: "Pestisida", items: ["Dekamon 22,43 L, 50 x 100 cc", "Dekamon 22,43 L, 20 x 500 cc", "Dekamon 22,43 L, 12 x 1 L"] },
        { label: "Dimacide", kategori: "Pestisida", items: ["Dimacide 400 EC, 20 x 500 cc"] },
        { label: "Dekapirim", kategori: "Pestisida", items: ["Dekapirim 400 SC, 50 x 100 cc", "Dekapirim 400 SC, 20 x 500 cc", "Dekapirim 400 SC, 12 x 1000 cc"] },
        { label: "Dektin", kategori: "Pestisida", items: ["Dektin 30 WG, 50 x 50 gr", "Dektin 30 WG, 20 x 200 gr", "Dektin 30 WG, 12 x 500 gr"] },
        { label: "Masalgin", kategori: "Pestisida", items: ["Masalgin 50 WP, 24 x 100 gr", "Masalgin 50 WP, 24 x 200 gr", "Masalgin 50 WP, 12 x 500 gr"] },
        { label: "Velimek", kategori: "Pestisida", items: ["Velimek 52,5 WP, 50 x 50 gr", "Velimek 52,5 WP, 20 x 200 gr", "Velimek 52,5 WP, 12 x 500 gr"] },
        { label: "Dekabond", kategori: "Pestisida", items: ["Dekabond, 50 x 100 cc", "Dekabond, 20 x 500 cc"] },
    ];

    useEffect(() => { fetchAllData(); }, []);

    const isPupuk = (name) => {
        const l = name.toLowerCase();
        return ['osmocote', 'gandapan', 'gandasil', 'mikrofid', 'dekorgan', 'gandastar', 'mastofol', 'pupuk'].some(kw => l.includes(kw));
    };

    const parseMonthIdx = (dateStr) => {
        const parts = String(dateStr).split('-');
        if (parts.length < 3) return -1;
        if (parts[0].length === 4) return parseInt(parts[1], 10) - 1;
        const monthMap = { 'jan': 0, 'feb': 1, 'mar': 2, 'apr': 3, 'mei': 4, 'may': 4, 'jun': 5, 'jul': 6, 'agu': 7, 'aug': 7, 'sep': 8, 'okt': 9, 'oct': 9, 'nov': 10, 'des': 11, 'dec': 11 };
        const m = parts[1].toLowerCase().substring(0, 3);
        return monthMap[m] !== undefined ? monthMap[m] : -1;
    };

    const fetchAllData = async () => {
        setLoading(true);
        try {
            const { data: rawInvoices } = await supabase.from('invoices').select('id, invoice_date, customer_name').ilike('invoice_date', `%${tahunAktif}%`).neq('status', 'cancelled');
            let allItems = [];
            if (rawInvoices && rawInvoices.length > 0) {
                const ids = rawInvoices.map(i => i.id);
                const { data: items } = await supabase.from('invoice_items').select('invoice_id, product_name, subtotal, qty').in('invoice_id', ids);
                if (items) {
                    allItems = items;
                    const matrix = {};
                    getAllProducts().forEach(p => { if (p.name) matrix[p.name] = { name: p.name, bulanan: Array(12).fill(0), totalTahun: 0 }; });
                    items.forEach(item => {
                        const inv = rawInvoices.find(v => v.id === item.invoice_id);
                        if (!inv || !inv.invoice_date) return;
                        const monthIdx = parseMonthIdx(inv.invoice_date);
                        if (monthIdx < 0 || monthIdx > 11) return;
                        const prodName = (item.product_name || "").trim();
                        if (!prodName) return;
                        const matched = matchProduct(prodName, 0.4);
                        const bucketName = matched?.match?.name || prodName;
                        if (!matrix[bucketName]) matrix[bucketName] = { name: bucketName, bulanan: Array(12).fill(0), totalTahun: 0 };
                        const val = item.subtotal || 0;
                        matrix[bucketName].bulanan[monthIdx] += val;
                        matrix[bucketName].totalTahun += val;
                    });
                    setDataBulananMatrix(matrix);
                } else { setDataBulananMatrix({}); }
            } else { setDataBulananMatrix({}); }
        } catch (error) { console.error("Gagal memuat data:", error); }
        finally { setLoading(false); }
    };

    // ═══ HELPERS ═══
    const formatRp = (num) => num === 0 ? '-' : num.toLocaleString('id-ID');
    const getProductData = (name) => dataBulananMatrix[name] || { name, bulanan: Array(12).fill(0), totalTahun: 0 };

    const getCategoryTotal = (kategori) => {
        const s = Array(12).fill(0);
        productGroups.filter(g => g.kategori === kategori).forEach(g => g.subgroups.forEach(sg => sg.items.forEach(n => { getProductData(n).bulanan.forEach((v, i) => s[i] += v); })));
        return s;
    };
    const getGrandTotal = () => { const p = getCategoryTotal('Pupuk'); const e = getCategoryTotal('Pestisida'); return p.map((v, i) => v + e[i]); };

    // Determine which months have data
    const getMonthsWithData = () => {
        const months = new Set();
        Object.values(dataBulananMatrix).forEach(d => { d.bulanan.forEach((v, i) => { if (v > 0) months.add(i); }); });
        return [...months].sort((a, b) => a - b);
    };

    // Kontribusi category totals
    const getKontribusiCategoryTotal = (kat) => {
        let t = 0;
        kontribusiGroups.filter(g => g.kategori === kat).forEach(g => g.items.forEach(n => { t += getProductData(n).totalTahun; }));
        return t;
    };

    // ═══ EXPORT EXCEL ═══
    const handleExportExcel = (monthFilter = null) => {
        const wb = XLSX.utils.book_new();
        // Sheet 1: Rekap Bulanan
        const bRows = [];
        productGroups.forEach(group => {
            bRows.push({ PRODUK: `── ${group.label} ──` });
            group.subgroups.forEach((sg, si) => {
                sg.items.forEach(name => {
                    const d = getProductData(name);
                    const row = { PRODUK: name };
                    if (monthFilter !== null) { row[namaBulan[monthFilter]] = d.bulanan[monthFilter]; }
                    else { namaBulan.forEach((b, i) => { row[b] = d.bulanan[i]; }); }
                    bRows.push(row);
                });
                if (si < group.subgroups.length - 1) bRows.push({ PRODUK: '' });
            });
            bRows.push({ PRODUK: '' });
        });
        const pM = getCategoryTotal('Pupuk'), eM = getCategoryTotal('Pestisida'), gM = getGrandTotal();
        const addS = (l, d) => { const r = { PRODUK: l }; if (monthFilter !== null) r[namaBulan[monthFilter]] = d[monthFilter]; else namaBulan.forEach((b, i) => { r[b] = d[i]; }); bRows.push(r); };
        addS('Jumlah Uang Produk Pupuk', pM); addS('Jumlah Uang Produk Pestisida', eM); addS('TOTAL OMZET PUPUK & PESTISIDA', gM);
        const ws1 = XLSX.utils.json_to_sheet(bRows);
        const cc = monthFilter !== null ? 2 : 13;
        for (let r = 1; r < bRows.length + 1; r++) for (let c = 1; c < cc; c++) { const a = XLSX.utils.encode_cell({ r, c }); if (ws1[a] && typeof ws1[a].v === 'number') ws1[a].z = '#,##0'; }
        XLSX.utils.book_append_sheet(wb, ws1, 'Rekap Bulanan');

        // Sheet 2: Kontribusi Global
        let tO = 0; kontribusiGroups.forEach(g => g.items.forEach(n => { tO += getProductData(n).totalTahun; }));
        const kRows = [];
        kontribusiGroups.forEach(group => {
            let gt = 0; group.items.forEach(n => { gt += getProductData(n).totalTahun; });
            const pct = tO > 0 ? ((gt / tO) * 100).toFixed(2) : '0.00';
            group.items.forEach((n, idx) => {
                const d = getProductData(n);
                const isL = idx === group.items.length - 1;
                kRows.push({ PRODUK: n, 'TOTAL PRODUK': d.totalTahun, 'TOTAL GROUP': isL ? gt : '', '%': isL ? parseFloat(pct) : '' });
            });
            kRows.push({ PRODUK: '' });
        });
        const pupukT = getKontribusiCategoryTotal('Pupuk'), pestiT = getKontribusiCategoryTotal('Pestisida');
        kRows.push({ PRODUK: 'JUMLAH PUPUK', 'TOTAL PRODUK': pupukT, 'TOTAL GROUP': pupukT, '%': tO > 0 ? parseFloat(((pupukT / tO) * 100).toFixed(2)) : 0 });
        kRows.push({ PRODUK: 'JUMLAH PESTISIDA', 'TOTAL PRODUK': pestiT, 'TOTAL GROUP': pestiT, '%': tO > 0 ? parseFloat(((pestiT / tO) * 100).toFixed(2)) : 0 });
        kRows.push({ PRODUK: 'TOTAL OMZET', 'TOTAL PRODUK': tO, 'TOTAL GROUP': tO, '%': 100.00 });
        kRows.push({ PRODUK: 'TARGET', 'TOTAL PRODUK': TARGET_TOTAL, 'TOTAL GROUP': TARGET_TOTAL, '%': '' });
        const ws2 = XLSX.utils.json_to_sheet(kRows);
        for (let r = 1; r < kRows.length + 1; r++) for (let c = 1; c <= 3; c++) { const a = XLSX.utils.encode_cell({ r, c }); if (ws2[a] && typeof ws2[a].v === 'number') ws2[a].z = c === 3 ? '0.00' : '#,##0'; }
        XLSX.utils.book_append_sheet(wb, ws2, 'Kontribusi Global');
        XLSX.writeFile(wb, `Rekap_Kontribusi_${tahunAktif}_${monthFilter !== null ? namaBulanPendek[monthFilter] : 'Semua'}.xlsx`);
    };

    const handleExportKontribusi = () => {
        const wb = XLSX.utils.book_new();
        let tO = 0; kontribusiGroups.forEach(g => g.items.forEach(n => { tO += getProductData(n).totalTahun; }));
        const rows = [];
        kontribusiGroups.forEach(group => {
            let gt = 0; group.items.forEach(n => { gt += getProductData(n).totalTahun; });
            const pct = tO > 0 ? ((gt / tO) * 100).toFixed(2) : '0.00';
            group.items.forEach((n, idx) => {
                const d = getProductData(n);
                const isL = idx === group.items.length - 1;
                rows.push({ PRODUK: n, 'TOTAL PRODUK': d.totalTahun, 'TOTAL GROUP': isL ? gt : '', '%': isL ? parseFloat(pct) : '' });
            });
            rows.push({ PRODUK: '' });
        });
        const pupukT = getKontribusiCategoryTotal('Pupuk'), pestiT = getKontribusiCategoryTotal('Pestisida');
        rows.push({ PRODUK: 'JUMLAH PUPUK', 'TOTAL PRODUK': pupukT, 'TOTAL GROUP': pupukT, '%': tO > 0 ? parseFloat(((pupukT / tO) * 100).toFixed(2)) : 0 });
        rows.push({ PRODUK: 'JUMLAH PESTISIDA', 'TOTAL PRODUK': pestiT, 'TOTAL GROUP': pestiT, '%': tO > 0 ? parseFloat(((pestiT / tO) * 100).toFixed(2)) : 0 });
        rows.push({ PRODUK: 'TOTAL OMZET', 'TOTAL PRODUK': tO, 'TOTAL GROUP': tO, '%': 100.00 });
        rows.push({ PRODUK: `TARGET ${tahunAktif}`, 'TOTAL PRODUK': TARGET_TOTAL, 'TOTAL GROUP': TARGET_TOTAL, '%': tO > 0 ? parseFloat(((tO / TARGET_TOTAL) * 100).toFixed(2)) : 0 });
        const ws = XLSX.utils.json_to_sheet(rows);
        for (let r = 1; r < rows.length + 1; r++) for (let c = 1; c <= 3; c++) { const a = XLSX.utils.encode_cell({ r, c }); if (ws[a] && typeof ws[a].v === 'number') ws[a].z = c === 3 ? '0.00' : '#,##0'; }
        XLSX.utils.book_append_sheet(wb, ws, 'Kontribusi Global');
        XLSX.writeFile(wb, `Kontribusi_Global_${tahunAktif}.xlsx`);
    };

    // ═══ LOADING ═══
    if (loading) {
        return (
            <div className="loading-overlay" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <div className="spinner spinner-lg"></div>
                <p>Menghitung data...</p>
            </div>
        );
    }

    const pupukMonths = getCategoryTotal('Pupuk');
    const pestiMonths = getCategoryTotal('Pestisida');
    const grandMonths = getGrandTotal();
    const hasData = Object.keys(dataBulananMatrix).length > 0;
    const monthsWithData = getMonthsWithData();

    const now = new Date();
    const tanggal = now.getDate();
    const bulanLabel = namaBulanPendek[now.getMonth()];

    let totalOmset = 0;
    kontribusiGroups.forEach(g => g.items.forEach(n => { totalOmset += getProductData(n).totalTahun; }));
    const totalPupuk = getKontribusiCategoryTotal('Pupuk');
    const totalPestisida = getKontribusiCategoryTotal('Pestisida');

    const groupColors = ['#ffffff', '#f8fafc'];

    // Styles
    const scrollStyle = { overflowX: 'auto', overflowY: 'auto', scrollbarWidth: 'auto', scrollbarColor: '#94a3b8 #e2e8f0' };
    const scrollCSS = `
        .visible-scrollbar::-webkit-scrollbar { height: 12px; width: 12px; }
        .visible-scrollbar::-webkit-scrollbar-track { background: #e2e8f0; border-radius: 6px; }
        .visible-scrollbar::-webkit-scrollbar-thumb { background: #94a3b8; border-radius: 6px; border: 2px solid #e2e8f0; }
        .visible-scrollbar::-webkit-scrollbar-thumb:hover { background: #64748b; }
        .num-cell { font-family: 'Segoe UI', system-ui, -apple-system, sans-serif; font-variant-numeric: tabular-nums; font-size: 0.82rem; letter-spacing: -0.01em; }
    `;

    return (
        <div className="animate-fade-in" style={{ padding: 'var(--space-xl)' }}>
            <style>{scrollCSS}</style>
            <div className="page-header">
                <h1>Admin-RekapPRO Kontribusi</h1>
                <p>Laporan kontribusi produk dan rekapitulasi penjualan secara real-time.</p>
            </div>

            {/* Tab Navigation — only 2 tabs now */}
            <div style={{ display: 'flex', gap: 'var(--space-sm)', marginBottom: 'var(--space-xl)', background: 'var(--bg-glass)', padding: 'var(--space-xs)', borderRadius: 'var(--radius-sm)', width: 'fit-content' }}>
                {['global', 'bulanan'].map((tab) => (
                    <button key={tab} onClick={() => setTabAktif(tab)}
                        className={`btn ${tabAktif === tab ? 'btn-primary' : ''}`}
                        style={{ background: tabAktif === tab ? '' : 'transparent', color: tabAktif === tab ? '' : 'var(--text-secondary)', boxShadow: tabAktif === tab ? '' : 'none' }}>
                        {tab === 'global' && 'Kontribusi Global'}
                        {tab === 'bulanan' && 'Rekap Bulanan'}
                    </button>
                ))}
            </div>

            {/* ═══════════════════════════════════════ */}
            {/* TAB 1: KONTRIBUSI GLOBAL               */}
            {/* ═══════════════════════════════════════ */}
            {tabAktif === 'global' && (
                <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
                    <div style={{ padding: '12px 20px', borderBottom: '3px solid #2c3e50', background: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                        <div>
                            <h2 style={{ fontSize: '1rem', fontWeight: 800, color: '#2c3e50', margin: 0 }}>EVALUASI BERJALAN {tahunAktif}</h2>
                            <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '2px 0 0 0' }}>Sampai Tanggal : {tanggal} Bulan {bulanLabel}</p>
                        </div>
                        <button onClick={handleExportKontribusi}
                            style={{ padding: '6px 14px', fontSize: '0.8rem', borderRadius: '6px', border: 'none', cursor: 'pointer', background: '#10b981', color: 'white', fontWeight: 600 }}>
                            📥 Export Excel
                        </button>
                    </div>
                    <div className="visible-scrollbar" style={scrollStyle}>
                        <table style={{ borderCollapse: 'collapse', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                            <thead>
                                <tr style={{ background: '#2c3e50' }}>
                                    <th style={{ color: 'white', padding: '8px 12px', textAlign: 'left', position: 'sticky', left: 0, background: '#2c3e50', zIndex: 10, borderRight: '1px solid rgba(255,255,255,0.15)' }}>PRODUK</th>
                                    <th style={{ color: 'white', padding: '8px 10px', textAlign: 'right', borderRight: '1px solid rgba(255,255,255,0.15)' }}>TOTAL PRODUK</th>
                                    <th style={{ color: 'white', padding: '8px 10px', textAlign: 'right', borderRight: '1px solid rgba(255,255,255,0.15)' }}>TOTAL GROUP</th>
                                    <th style={{ color: 'white', padding: '8px 10px', textAlign: 'right' }}>%</th>
                                </tr>
                            </thead>
                            <tbody>
                                {/* PUPUK Section */}
                                {kontribusiGroups.filter(g => g.kategori === 'Pupuk').map((group, gIdx) => {
                                    let groupTotal = 0;
                                    group.items.forEach(n => { groupTotal += getProductData(n).totalTahun; });
                                    const pct = totalOmset > 0 ? ((groupTotal / totalOmset) * 100).toFixed(2) : '0.00';
                                    const bg = groupColors[gIdx % 2];
                                    return (
                                        <Fragment key={`kp-${gIdx}`}>
                                            {group.items.map((name, ii) => {
                                                const d = getProductData(name);
                                                const isL = ii === group.items.length - 1;
                                                const isF = ii === 0;
                                                return (
                                                    <tr key={`ki-${gIdx}-${ii}`} style={{ background: bg, borderTop: isF ? '2px solid #cbd5e1' : '1px solid #f1f5f9', borderBottom: isL ? '2px solid #cbd5e1' : '1px solid #f1f5f9' }}>
                                                        <td style={{ padding: '5px 12px', fontWeight: 500, color: '#334155', position: 'sticky', left: 0, background: bg, borderRight: '1px solid #e2e8f0', zIndex: 5 }}>{name}</td>
                                                        <td className="num-cell" style={{ padding: '5px 10px', textAlign: 'right', color: '#475569', borderRight: '1px solid #e2e8f0' }}>{d.totalTahun > 0 ? d.totalTahun.toLocaleString('id-ID') : '-'}</td>
                                                        <td className="num-cell" style={{ padding: '5px 10px', textAlign: 'right', borderRight: '1px solid #e2e8f0', fontWeight: isL ? 700 : 400, color: isL ? '#1e40af' : '#94a3b8' }}>{isL ? groupTotal.toLocaleString('id-ID') : '-'}</td>
                                                        <td className="num-cell" style={{ padding: '5px 10px', textAlign: 'right', fontWeight: isL ? 700 : 400, color: isL ? '#059669' : '#94a3b8' }}>{isL ? pct : '-'}</td>
                                                    </tr>
                                                );
                                            })}
                                        </Fragment>
                                    );
                                })}

                                {/* JUMLAH PUPUK */}
                                <tr style={{ background: '#dcfce7', borderTop: '3px solid #16a34a' }}>
                                    <td style={{ padding: '8px 12px', fontWeight: 800, color: '#166534', position: 'sticky', left: 0, background: '#dcfce7', borderRight: '1px solid #bbf7d0', zIndex: 5, fontSize: '0.82rem' }}>JUMLAH PUPUK</td>
                                    <td className="num-cell" style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 800, color: '#166534', borderRight: '1px solid #bbf7d0' }}>{formatRp(totalPupuk)}</td>
                                    <td className="num-cell" style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 800, color: '#166534', borderRight: '1px solid #bbf7d0' }}>{formatRp(totalPupuk)}</td>
                                    <td className="num-cell" style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 800, color: '#166534' }}>{totalOmset > 0 ? ((totalPupuk / totalOmset) * 100).toFixed(2) : '0.00'}</td>
                                </tr>

                                {/* PESTISIDA Section */}
                                {kontribusiGroups.filter(g => g.kategori === 'Pestisida').map((group, gIdx) => {
                                    let groupTotal = 0;
                                    group.items.forEach(n => { groupTotal += getProductData(n).totalTahun; });
                                    const pct = totalOmset > 0 ? ((groupTotal / totalOmset) * 100).toFixed(2) : '0.00';
                                    const bg = groupColors[gIdx % 2];
                                    return (
                                        <Fragment key={`ke-${gIdx}`}>
                                            {group.items.map((name, ii) => {
                                                const d = getProductData(name);
                                                const isL = ii === group.items.length - 1;
                                                const isF = ii === 0;
                                                return (
                                                    <tr key={`kei-${gIdx}-${ii}`} style={{ background: bg, borderTop: isF ? '2px solid #cbd5e1' : '1px solid #f1f5f9', borderBottom: isL ? '2px solid #cbd5e1' : '1px solid #f1f5f9' }}>
                                                        <td style={{ padding: '5px 12px', fontWeight: 500, color: '#334155', position: 'sticky', left: 0, background: bg, borderRight: '1px solid #e2e8f0', zIndex: 5 }}>{name}</td>
                                                        <td className="num-cell" style={{ padding: '5px 10px', textAlign: 'right', color: '#475569', borderRight: '1px solid #e2e8f0' }}>{d.totalTahun > 0 ? d.totalTahun.toLocaleString('id-ID') : '-'}</td>
                                                        <td className="num-cell" style={{ padding: '5px 10px', textAlign: 'right', borderRight: '1px solid #e2e8f0', fontWeight: isL ? 700 : 400, color: isL ? '#1e40af' : '#94a3b8' }}>{isL ? groupTotal.toLocaleString('id-ID') : '-'}</td>
                                                        <td className="num-cell" style={{ padding: '5px 10px', textAlign: 'right', fontWeight: isL ? 700 : 400, color: isL ? '#059669' : '#94a3b8' }}>{isL ? pct : '-'}</td>
                                                    </tr>
                                                );
                                            })}
                                        </Fragment>
                                    );
                                })}

                                {/* JUMLAH PESTISIDA */}
                                <tr style={{ background: '#fee2e2', borderTop: '3px solid #ef4444' }}>
                                    <td style={{ padding: '8px 12px', fontWeight: 800, color: '#991b1b', position: 'sticky', left: 0, background: '#fee2e2', borderRight: '1px solid #fecaca', zIndex: 5, fontSize: '0.82rem' }}>JUMLAH PESTISIDA</td>
                                    <td className="num-cell" style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 800, color: '#991b1b', borderRight: '1px solid #fecaca' }}>{formatRp(totalPestisida)}</td>
                                    <td className="num-cell" style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 800, color: '#991b1b', borderRight: '1px solid #fecaca' }}>{formatRp(totalPestisida)}</td>
                                    <td className="num-cell" style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 800, color: '#991b1b' }}>{totalOmset > 0 ? ((totalPestisida / totalOmset) * 100).toFixed(2) : '0.00'}</td>
                                </tr>

                                {/* TOTAL OMZET */}
                                <tr style={{ background: '#1e293b', borderTop: '4px double #475569' }}>
                                    <td style={{ padding: '10px 12px', fontWeight: 900, color: '#fbbf24', fontSize: '0.85rem', position: 'sticky', left: 0, background: '#1e293b', borderRight: '1px solid #475569', zIndex: 5 }}>TOTAL OMZET</td>
                                    <td className="num-cell" style={{ padding: '10px 10px', textAlign: 'right', fontWeight: 900, color: '#fbbf24', borderRight: '1px solid #475569' }}>{formatRp(totalOmset)}</td>
                                    <td className="num-cell" style={{ padding: '10px 10px', textAlign: 'right', fontWeight: 900, color: '#fbbf24', borderRight: '1px solid #475569' }}>{formatRp(totalOmset)}</td>
                                    <td className="num-cell" style={{ padding: '10px 10px', textAlign: 'right', fontWeight: 900, color: '#fbbf24' }}>100.00</td>
                                </tr>

                                {/* TARGET */}
                                <tr style={{ background: '#fef3c7', borderTop: '2px solid #f59e0b' }}>
                                    <td style={{ padding: '8px 12px', fontWeight: 800, color: '#92400e', fontSize: '0.82rem', position: 'sticky', left: 0, background: '#fef3c7', borderRight: '1px solid #fcd34d', zIndex: 5 }}>🎯 TARGET {tahunAktif}</td>
                                    <td className="num-cell" style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 800, color: '#92400e', borderRight: '1px solid #fcd34d' }}>{TARGET_TOTAL.toLocaleString('id-ID')}</td>
                                    <td className="num-cell" style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 800, color: '#92400e', borderRight: '1px solid #fcd34d' }}>{TARGET_TOTAL.toLocaleString('id-ID')}</td>
                                    <td className="num-cell" style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 800, color: '#92400e' }}>{totalOmset > 0 ? ((totalOmset / TARGET_TOTAL) * 100).toFixed(2) : '0.00'}</td>
                                </tr>

                                {/* PENCAPAIAN */}
                                <tr style={{ background: totalOmset >= TARGET_TOTAL ? '#dcfce7' : '#fef2f2' }}>
                                    <td style={{ padding: '8px 12px', fontWeight: 700, color: totalOmset >= TARGET_TOTAL ? '#166534' : '#991b1b', fontSize: '0.82rem', position: 'sticky', left: 0, background: 'inherit', borderRight: '1px solid #e2e8f0', zIndex: 5 }}>PENCAPAIAN TARGET</td>
                                    <td className="num-cell" colSpan={3} style={{ padding: '8px 10px', textAlign: 'center', fontWeight: 800, color: totalOmset >= TARGET_TOTAL ? '#166534' : '#991b1b', fontSize: '0.9rem' }}>
                                        {totalOmset > 0 ? ((totalOmset / TARGET_TOTAL) * 100).toFixed(2) : '0.00'}% dari Target
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* ═══════════════════════════════════════ */}
            {/* TAB 2: REKAP BULANAN                   */}
            {/* ═══════════════════════════════════════ */}
            {tabAktif === 'bulanan' && (
                <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
                    <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border-glass)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-primary)', flexWrap: 'wrap', gap: '8px' }}>
                        <h2 style={{ fontSize: '1rem', fontWeight: 600 }}>Rekapitulasi Penjualan Bulanan (2026)</h2>
                        <select
                            onChange={(e) => {
                                const val = e.target.value;
                                if (val === 'all') handleExportExcel(null);
                                else handleExportExcel(Number(val));
                                e.target.value = '';
                            }}
                            defaultValue=""
                            style={{ padding: '6px 10px', fontSize: '0.8rem', borderRadius: '6px', border: 'none', cursor: 'pointer', background: '#10b981', color: 'white', fontWeight: 600 }}
                        >
                            <option value="" disabled>📥 Export Excel</option>
                            <option value="all">Semua Periode</option>
                            {monthsWithData.map(i => (
                                <option key={i} value={i}>{namaBulanPendek[i]}</option>
                            ))}
                        </select>
                    </div>
                    <div className="visible-scrollbar" style={scrollStyle}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                            <thead>
                                <tr style={{ background: '#2c3e50' }}>
                                    <th style={{ color: 'white', padding: '10px 12px', textAlign: 'left', position: 'sticky', left: 0, background: '#2c3e50', zIndex: 10, borderRight: '1px solid rgba(255,255,255,0.1)', minWidth: '250px' }}>PRODUK</th>
                                    {namaBulan.map(b => (
                                        <th key={b} style={{ color: 'white', padding: '10px 8px', textAlign: 'center', borderRight: '1px solid rgba(255,255,255,0.1)', minWidth: '100px' }}>{b}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {hasData ? (
                                    <>
                                        {productGroups.map((group, gIdx) => (
                                            <Fragment key={`group-${gIdx}`}>
                                                <tr>
                                                    <td colSpan={13} style={{ padding: '8px 12px', fontWeight: 900, color: 'white', background: group.kategori === 'Pupuk' ? '#166534' : '#991b1b', position: 'sticky', left: 0, fontSize: '0.82rem', letterSpacing: '1px' }}>
                                                        {group.label}
                                                    </td>
                                                </tr>
                                                {group.subgroups.map((sg, sgIdx) => (
                                                    <Fragment key={`sg-${gIdx}-${sgIdx}`}>
                                                        {sg.items.map((name, itemIdx) => {
                                                            const d = getProductData(name);
                                                            return (
                                                                <tr key={`i-${gIdx}-${sgIdx}-${itemIdx}`} style={{ borderBottom: '1px solid #f3f4f6' }}>
                                                                    <td style={{ padding: '5px 12px 5px 20px', fontWeight: 500, color: '#334155', position: 'sticky', left: 0, background: 'white', borderRight: '1px solid #e5e7eb', boxShadow: '2px 0 5px rgba(0,0,0,0.03)', zIndex: 5 }}>{name}</td>
                                                                    {d.bulanan.map((val, i) => (
                                                                        <td key={i} style={{ padding: '5px 8px', textAlign: 'right', fontFamily: 'monospace', color: '#475569', borderRight: '1px solid #f3f4f6' }}>{val > 0 ? val.toLocaleString('id-ID') : '-'}</td>
                                                                    ))}
                                                                </tr>
                                                            );
                                                        })}
                                                        {sgIdx < group.subgroups.length - 1 && (
                                                            <tr><td colSpan={13} style={{ height: '8px', background: '#f8fafc', padding: 0, borderBottom: 'none' }}></td></tr>
                                                        )}
                                                    </Fragment>
                                                ))}
                                                {gIdx < productGroups.length - 1 && (
                                                    <tr><td colSpan={13} style={{ height: '14px', background: '#e2e8f0', padding: 0, borderBottom: 'none' }}></td></tr>
                                                )}
                                            </Fragment>
                                        ))}

                                        {/* SUMMARY */}
                                        <tr style={{ background: '#dcfce7', borderTop: '3px solid #16a34a' }}>
                                            <td style={{ padding: '10px 12px', fontWeight: 800, color: '#166534', position: 'sticky', left: 0, background: '#dcfce7', borderRight: '1px solid #bbf7d0', zIndex: 5, fontSize: '0.82rem' }}>Jumlah Uang Produk Pupuk</td>
                                            {pupukMonths.map((v, i) => (<td key={i} style={{ padding: '10px 8px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 800, color: '#166534', borderRight: '1px solid #bbf7d0' }}>{formatRp(v)}</td>))}
                                        </tr>
                                        <tr style={{ background: '#fee2e2', borderTop: '1px solid #fca5a5' }}>
                                            <td style={{ padding: '10px 12px', fontWeight: 800, color: '#991b1b', position: 'sticky', left: 0, background: '#fee2e2', borderRight: '1px solid #fecaca', zIndex: 5, fontSize: '0.82rem' }}>Jumlah Uang Produk Pestisida</td>
                                            {pestiMonths.map((v, i) => (<td key={i} style={{ padding: '10px 8px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 800, color: '#991b1b', borderRight: '1px solid #fecaca' }}>{formatRp(v)}</td>))}
                                        </tr>
                                        <tr style={{ background: '#1e293b', borderTop: '4px double #475569' }}>
                                            <td style={{ padding: '12px 12px', fontWeight: 900, color: '#fbbf24', position: 'sticky', left: 0, background: '#1e293b', borderRight: '1px solid #475569', zIndex: 5, fontSize: '0.85rem' }}>TOTAL OMZET PUPUK & PESTISIDA</td>
                                            {grandMonths.map((v, i) => (<td key={i} style={{ padding: '12px 8px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 900, color: '#fbbf24', borderRight: '1px solid #475569' }}>{formatRp(v)}</td>))}
                                        </tr>
                                    </>
                                ) : (
                                    <tr><td colSpan={13} style={{ padding: '32px', textAlign: 'center', color: '#94a3b8', fontStyle: 'italic' }}>Tidak ada data untuk tahun {tahunAktif}</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}