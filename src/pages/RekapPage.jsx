import { useState, useEffect, useMemo, useRef } from 'react';
import * as XLSX from 'xlsx';
import {
    subscribeInvoices, saveInvoice, upsertCustomer,
    upsertProduct, updateTargetProgress, resetAllData
} from '../lib/db';
import { exportRekapToExcel } from '../lib/excelExport';
import { matchProduct } from '../lib/masterData';
import {
    FileText, Download, UploadCloud, Search, Filter, X,
    ChevronDown, ChevronUp, Calendar, Users, Package,
    TrendingUp, RefreshCw, Check, AlertCircle
} from 'lucide-react';

export default function RekapPage() {
    const [invoices, setInvoices] = useState([]);
    const [search, setSearch] = useState('');
    const [filterCustomer, setFilterCustomer] = useState('');
    const [filterMonth, setFilterMonth] = useState('');
    const [filterDateFrom, setFilterDateFrom] = useState('');
    const [filterDateTo, setFilterDateTo] = useState('');
    const [showFilters, setShowFilters] = useState(false);
    const [expandedIds, setExpandedIds] = useState(new Set());
    const [page, setPage] = useState(0);
    const perPage = 10;

    // Excel import states
    const [showImportModal, setShowImportModal] = useState(false);
    const [importFile, setImportFile] = useState(null);
    const [wipeData, setWipeData] = useState(false);
    const [isImporting, setIsImporting] = useState(false);
    const [importProgress, setImportProgress] = useState(0);
    const [importStatus, setImportStatus] = useState({ type: '', msg: '' });
    const fileInputRef = useRef(null);

    useEffect(() => {
        const unsub = subscribeInvoices(setInvoices);
        return unsub;
    }, []);

    // ─── Derived data ───
    const customers = useMemo(() => {
        const set = new Set(invoices.map(i => i.customerName).filter(Boolean));
        return Array.from(set).sort();
    }, [invoices]);

    const months = useMemo(() => {
        const set = new Set();
        invoices.forEach(inv => {
            const m = extractMonth(inv.invoiceDate);
            if (m) set.add(m);
        });
        return Array.from(set).sort();
    }, [invoices]);

    // ─── Filter logic ───
    const filtered = useMemo(() => {
        let result = invoices;

        // Search
        if (search) {
            const q = search.toLowerCase();
            result = result.filter(inv =>
                (inv.customerName || '').toLowerCase().includes(q) ||
                (inv.invoiceNumber || '').toLowerCase().includes(q) ||
                (inv.city || '').toLowerCase().includes(q) ||
                (inv.products || []).some(p => (p.name || '').toLowerCase().includes(q))
            );
        }

        // Customer filter
        if (filterCustomer) {
            result = result.filter(inv => inv.customerName === filterCustomer);
        }

        // Month filter
        if (filterMonth) {
            result = result.filter(inv => extractMonth(inv.invoiceDate) === filterMonth);
        }

        // Date range
        if (filterDateFrom || filterDateTo) {
            result = result.filter(inv => {
                const d = parseInvDate(inv.invoiceDate);
                if (!d) return true;
                if (filterDateFrom && d < new Date(filterDateFrom)) return false;
                if (filterDateTo && d > new Date(filterDateTo + 'T23:59:59')) return false;
                return true;
            });
        }

        return result;
    }, [invoices, search, filterCustomer, filterMonth, filterDateFrom, filterDateTo]);

    // Reset page when filters change
    useEffect(() => { setPage(0); }, [search, filterCustomer, filterMonth, filterDateFrom, filterDateTo]);

    // ─── Pagination ───
    const totalPages = Math.ceil(filtered.length / perPage);
    const paginated = filtered.slice(page * perPage, (page + 1) * perPage);

    // ─── Summary stats ───
    const stats = useMemo(() => ({
        totalInvoices: filtered.length,
        totalAmount: filtered.reduce((s, i) => s + (i.totalAmount || 0), 0),
        totalCustomers: new Set(filtered.map(i => i.customerName)).size,
        totalProducts: filtered.reduce((s, i) => s + (i.products?.length || 0), 0),
    }), [filtered]);

    const hasActiveFilters = filterCustomer || filterMonth || filterDateFrom || filterDateTo;

    // ─── Handlers ───
    const toggleExpand = (id) => {
        setExpandedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const expandAll = () => {
        setExpandedIds(new Set(paginated.map(i => i.id)));
    };

    const collapseAll = () => {
        setExpandedIds(new Set());
    };

    const resetFilters = () => {
        setSearch('');
        setFilterCustomer('');
        setFilterMonth('');
        setFilterDateFrom('');
        setFilterDateTo('');
    };

    const handleExport = () => {
        const dateStr = new Date().toISOString().split('T')[0];
        exportRekapToExcel(filtered, `Rekap_Penjualan_${dateStr}.xlsx`);
    };

    const formatRp = (n) => `Rp ${(n || 0).toLocaleString('id-ID')}`;

    // ─── Excel Import Handlers ───
    const handleFileSelect = (e) => {
        if (e.target.files && e.target.files.length > 0) {
            setImportFile(e.target.files[0]);
            setImportStatus({ type: '', msg: '' });
        }
    };

    const processImport = async () => {
        if (!importFile) {
            setImportStatus({ type: 'error', msg: 'Pilih file Excel terlebih dahulu.' });
            return;
        }

        setIsImporting(true);
        setImportProgress(0);
        setImportStatus({ type: 'info', msg: 'Membaca file Excel...' });

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const sheetNames = workbook.SheetNames;
                let invoicesList = [];

                const isLegacyRekap = sheetNames.some(name => ['2023', '2024', '2025'].includes(name));

                if (isLegacyRekap) {
                    setImportStatus({ type: 'info', msg: 'Format Rekap Legacy terdeteksi. Merangkum data bulanan...' });
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

                            const matchedData = matchProduct(productName, 0.4);
                            const officialData = matchedData?.match;
                            const isAmountData = isNaN(parseFloat(row[11])) && parseFloat(row[11]) > 500; // rough heuristic if legacy file holds amounts instead of qty

                            for (let m = 0; m < 12; m++) {
                                const valIndex = 7 + (m * 4);
                                if (row.length > valIndex && !isNaN(parseFloat(row[valIndex]))) {
                                    const val = parseFloat(row[valIndex]);
                                    if (val > 0) {
                                        const officialPrice = officialData?.price || val; // in legacy, val is usually the amount. If we need qty, we divide. But legacy is amount-based. Wait, let's keep legacy intact as it's specifically "Rangkuman" values unless user explicitly wants prices injected into legacy too. Actually user showed screenshot of standard parsing. Let's apply it carefully.
                                        
                                        const invDate = `${year}-${String(m + 1).padStart(2, '0')}-28`;
                                        const cleanCode = productName.substring(0, 5).replace(/[^a-zA-Z]/g, '').toUpperCase();
                                        const invoiceNumber = `IMP-${year}${String(m + 1).padStart(2, '0')}-${cleanCode}-${Math.floor(Math.random() * 1000)}`;

                                        invoicesList.push({
                                            customerName: 'DATA IMPOR',
                                            city: 'Impor',
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
                                            source: 'excel_import'
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
                        const getDate = () => row[rowKeys.find(k => k?.toLowerCase().includes('tanggal'))];
                        const getSpb = () => row[rowKeys.find(k => k?.toLowerCase().includes('spb'))];
                        const getCust = () => row[rowKeys.find(k => k?.toLowerCase().includes('customer'))];
                        const getCity = () => row[rowKeys.find(k => k?.toLowerCase().includes('area') || k?.toLowerCase().includes('kota'))];
                        const getProd = () => row[rowKeys.find(k => k?.toLowerCase().includes('barang'))];
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
                                source: 'excel_import'
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

                if (wipeData) {
                    setImportStatus({ type: 'info', msg: 'Menghapus data lama (Wipe Data)...' });
                    await resetAllData();
                }

                setImportStatus({ type: 'info', msg: `Menyimpan ${invoicesList.length} invoice ke database...` });

                let successCount = 0;
                for (let i = 0; i < invoicesList.length; i++) {
                    const inv = invoicesList[i];
                    try {
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
                    setImportProgress(Math.round(((i + 1) / invoicesList.length) * 100));
                }

                setImportStatus({ type: 'success', msg: `Berhasil import ${successCount} dari ${invoicesList.length} invoice!` });
                setTimeout(() => {
                    setShowImportModal(false);
                    setImportFile(null);
                    setImportStatus({ type: '', msg: '' });
                    setWipeData(false);
                }, 2500);

            } catch (err) {
                console.error(err);
                setImportStatus({ type: 'error', msg: 'Gagal memproses file: ' + err.message });
            } finally {
                setIsImporting(false);
            }
        };
        reader.readAsArrayBuffer(importFile);
    };

    const closeImportModal = () => {
        if (isImporting) return;
        setShowImportModal(false);
        setImportFile(null);
        setImportStatus({ type: '', msg: '' });
    };

    // ─── Render ───
    return (
        <div className="animate-fade-in">
            {/* Import Modal */}
            {showImportModal && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
                    zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: 20
                }}>
                    <div className="glass-card" style={{
                        maxWidth: 450, width: '100%', position: 'relative',
                        animation: 'slideUp 0.3s ease'
                    }}>
                        {!isImporting && (
                            <button onClick={closeImportModal} style={{
                                position: 'absolute', top: 16, right: 16,
                                background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer'
                            }}>
                                <X size={20} />
                            </button>
                        )}
                        <h2 style={{ fontSize: '1.2rem', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                            <UploadCloud size={20} /> Import Data Rekap
                        </h2>
                        <input 
                            type="file" 
                            accept=".xlsx, .xls"
                            ref={fileInputRef}
                            onChange={handleFileSelect}
                            style={{ display: 'none' }}
                        />
                        <button 
                            className="btn btn-secondary" 
                            onClick={() => fileInputRef.current.click()}
                            disabled={isImporting}
                            style={{ width: '100%', justifyContent: 'center', marginBottom: 16, padding: '12px' }}
                        >
                            {importFile ? importFile.name : 'Pilih File Excel...'}
                        </button>
                        
                        <div style={{
                            display: 'flex', alignItems: 'center', gap: 10, 
                            marginBottom: 20, padding: 12, borderRadius: 'var(--radius-sm)',
                            background: wipeData ? 'var(--accent-rose-glow)' : 'var(--bg-glass)',
                            transition: 'background 0.3s ease'
                        }}>
                            <input 
                                type="checkbox" 
                                id="wipeDataCheckbox" 
                                checked={wipeData}
                                onChange={(e) => setWipeData(e.target.checked)}
                                disabled={isImporting}
                                style={{ accentColor: 'var(--accent-rose)', width: 16, height: 16 }}
                            />
                            <label htmlFor="wipeDataCheckbox" style={{ fontSize: '0.85rem', color: wipeData ? 'var(--accent-rose)' : 'var(--text-secondary)', cursor: 'pointer' }}>
                                <strong>Hapus Semua Data Terlebih Dahulu</strong> (Wipe & Replace)
                            </label>
                        </div>

                        <button 
                            className="btn btn-success" 
                            onClick={processImport}
                            disabled={isImporting || !importFile}
                            style={{ width: '100%', justifyContent: 'center' }}
                        >
                            {isImporting ? 'Memproses...' : 'Mulai Import'}
                        </button>

                        {isImporting && (
                            <div style={{ marginTop: 16 }}>
                                <div style={{ width: '100%', height: 6, background: 'var(--border-glass)', borderRadius: 3, overflow: 'hidden' }}>
                                    <div style={{ height: '100%', background: 'var(--accent-emerald)', width: `${importProgress}%`, transition: 'width 0.2s' }}></div>
                                </div>
                                <p style={{ textAlign: 'center', fontSize: '0.75rem', marginTop: 4, color: 'var(--text-muted)' }}>{importProgress}% Selesai</p>
                            </div>
                        )}

                        {importStatus.msg && (
                            <div style={{
                                marginTop: 16, padding: '12px', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem', fontWeight: 500,
                                display: 'flex', alignItems: 'center', gap: 8,
                                background: importStatus.type === 'success' ? 'var(--accent-emerald-glow)' : importStatus.type === 'error' ? 'var(--accent-rose-glow)' : 'var(--accent-blue-glow)',
                                color: importStatus.type === 'success' ? 'var(--accent-emerald)' : importStatus.type === 'error' ? 'var(--accent-rose)' : 'var(--accent-blue)',
                            }}>
                                {importStatus.type === 'success' ? <Check size={16} /> : <AlertCircle size={16} />}
                                {importStatus.msg}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Header */}
            <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
                <div>
                    <h1>Rekap Penjualan</h1>
                    <p>Data penjualan dikelompokkan per invoice</p>
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <button
                        className="btn btn-secondary"
                        onClick={() => setShowImportModal(true)}
                        style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem' }}
                    >
                        <UploadCloud size={16} />
                        Import Excel
                    </button>
                    <button
                        className="btn btn-primary"
                        onClick={handleExport}
                        disabled={filtered.length === 0}
                        style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem' }}
                    >
                        <Download size={16} />
                        Export Excel
                    </button>
                </div>
            </div>

            {/* Summary Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 20 }}>
                <StatMini icon={<FileText size={18} />} color="var(--accent-blue)" label="Total Invoice" value={stats.totalInvoices} />
                <StatMini icon={<TrendingUp size={18} />} color="var(--accent-emerald)" label="Total Nilai" value={formatRp(stats.totalAmount)} />
                <StatMini icon={<Users size={18} />} color="var(--accent-purple)" label="Customer" value={stats.totalCustomers} />
                <StatMini icon={<Package size={18} />} color="var(--accent-amber)" label="Total Produk" value={stats.totalProducts} />
            </div>

            {/* Search & Filter Bar */}
            <div className="glass-card" style={{ padding: '16px 20px', marginBottom: 16 }}>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                    {/* Search */}
                    <div className="search-bar" style={{ flex: 1, minWidth: 200 }}>
                        <Search className="search-icon" />
                        <input
                            type="text"
                            placeholder="Cari customer, no. SPB, produk..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                    </div>

                    {/* Filter toggle */}
                    <button
                        className={`btn ${showFilters ? 'btn-primary' : 'btn-secondary'}`}
                        onClick={() => setShowFilters(!showFilters)}
                        style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8rem', position: 'relative' }}
                    >
                        <Filter size={15} />
                        Filter
                        {hasActiveFilters && (
                            <span style={{
                                position: 'absolute', top: -4, right: -4,
                                width: 8, height: 8, borderRadius: '50%',
                                background: 'var(--accent-rose)'
                            }} />
                        )}
                    </button>

                    {/* Expand/Collapse */}
                    <button className="btn btn-secondary" onClick={expandAll}
                        style={{ fontSize: '0.8rem', padding: '8px 12px' }}>
                        <ChevronDown size={14} /> Buka Semua
                    </button>
                    <button className="btn btn-secondary" onClick={collapseAll}
                        style={{ fontSize: '0.8rem', padding: '8px 12px' }}>
                        <ChevronUp size={14} /> Tutup Semua
                    </button>
                </div>

                {/* Filter panel */}
                {showFilters && (
                    <div style={{
                        marginTop: 14, paddingTop: 14,
                        borderTop: '1px solid var(--border-glass)',
                        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12,
                        alignItems: 'end'
                    }}>
                        {/* Customer filter */}
                        <div>
                            <label style={labelStyle}>Customer</label>
                            <select value={filterCustomer} onChange={e => setFilterCustomer(e.target.value)}
                                style={selectStyle}>
                                <option value="">Semua Customer</option>
                                {customers.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>

                        {/* Month filter */}
                        <div>
                            <label style={labelStyle}>Bulan</label>
                            <select value={filterMonth} onChange={e => setFilterMonth(e.target.value)}
                                style={selectStyle}>
                                <option value="">Semua Bulan</option>
                                {months.map(m => <option key={m} value={m}>{m}</option>)}
                            </select>
                        </div>

                        {/* Date from */}
                        <div>
                            <label style={labelStyle}>Dari Tanggal</label>
                            <input type="date" value={filterDateFrom} onChange={e => setFilterDateFrom(e.target.value)}
                                style={selectStyle} />
                        </div>

                        {/* Date to */}
                        <div>
                            <label style={labelStyle}>Sampai Tanggal</label>
                            <input type="date" value={filterDateTo} onChange={e => setFilterDateTo(e.target.value)}
                                style={selectStyle} />
                        </div>

                        {/* Reset */}
                        {hasActiveFilters && (
                            <button className="btn btn-secondary" onClick={resetFilters}
                                style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 4, alignSelf: 'end' }}>
                                <RefreshCw size={14} /> Reset
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* Invoice Cards */}
            {filtered.length === 0 ? (
                <div className="glass-card" style={{
                    padding: 60, textAlign: 'center', color: 'var(--text-muted)'
                }}>
                    <FileText size={48} style={{ marginBottom: 12, opacity: 0.3 }} />
                    <p style={{ fontSize: '1rem', fontWeight: 600, marginBottom: 4 }}>Tidak ada data</p>
                    <p style={{ fontSize: '0.85rem' }}>
                        {hasActiveFilters ? 'Coba ubah filter pencarian' : 'Import data Excel atau scan invoice untuk memulai'}
                    </p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {paginated.map((inv, idx) => (
                        <InvoiceCard
                            key={inv.id || idx}
                            invoice={inv}
                            index={page * perPage + idx}
                            expanded={expandedIds.has(inv.id)}
                            onToggle={() => toggleExpand(inv.id)}
                            formatRp={formatRp}
                        />
                    ))}
                </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="glass-card" style={{
                    marginTop: 16, padding: '12px 20px',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    fontSize: '0.85rem'
                }}>
                    <span style={{ color: 'var(--text-muted)' }}>
                        Halaman {page + 1} dari {totalPages} — Menampilkan {page * perPage + 1}-{Math.min((page + 1) * perPage, filtered.length)} dari {filtered.length} invoice
                    </span>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        <button
                            className="btn btn-secondary"
                            style={{ padding: '6px 14px', fontSize: '0.8rem' }}
                            onClick={() => setPage(0)}
                            disabled={page === 0}
                        >
                            ⟪ Awal
                        </button>
                        <button
                            className="btn btn-secondary"
                            style={{ padding: '6px 14px', fontSize: '0.8rem' }}
                            onClick={() => setPage(p => Math.max(0, p - 1))}
                            disabled={page === 0}
                        >
                            ← Prev
                        </button>
                        <span style={{
                            padding: '6px 14px', background: 'var(--gradient-primary)',
                            color: 'white', borderRadius: 'var(--radius-sm)',
                            fontWeight: 700, fontSize: '0.85rem', minWidth: 36, textAlign: 'center'
                        }}>
                            {page + 1}
                        </span>
                        <button
                            className="btn btn-secondary"
                            style={{ padding: '6px 14px', fontSize: '0.8rem' }}
                            onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                            disabled={page >= totalPages - 1}
                        >
                            Next →
                        </button>
                        <button
                            className="btn btn-secondary"
                            style={{ padding: '6px 14px', fontSize: '0.8rem' }}
                            onClick={() => setPage(totalPages - 1)}
                            disabled={page >= totalPages - 1}
                        >
                            Akhir ⟫
                        </button>
                    </div>
                </div>
            )}

            {/* Footer count (single page) */}
            {filtered.length > 0 && totalPages <= 1 && (
                <div style={{
                    marginTop: 16, textAlign: 'center',
                    fontSize: '0.8rem', color: 'var(--text-muted)'
                }}>
                    Menampilkan {filtered.length} dari {invoices.length} invoice
                </div>
            )}

            <style>{`
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
                .spin { animation: spin 1s linear infinite; }
            `}</style>
        </div>
    );
}

// ─── Sub-components ───

function StatMini({ icon, color, label, value }) {
    return (
        <div className="glass-card" style={{
            padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12
        }}>
            <div style={{
                width: 36, height: 36, borderRadius: 'var(--radius-sm)',
                background: `${color}15`, display: 'flex', alignItems: 'center',
                justifyContent: 'center', color, flexShrink: 0
            }}>
                {icon}
            </div>
            <div>
                <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {label}
                </p>
                <p style={{ fontSize: '1.05rem', fontWeight: 700, marginTop: 2 }}>
                    {value}
                </p>
            </div>
        </div>
    );
}

function InvoiceCard({ invoice, index, expanded, onToggle, formatRp }) {
    const products = invoice.products || [];

    return (
        <div className="glass-card" style={{ padding: 0, overflow: 'hidden', transition: 'all 0.2s ease' }}>
            {/* Card header — clickable */}
            <div
                onClick={onToggle}
                style={{
                    padding: '14px 20px', cursor: 'pointer',
                    display: 'grid',
                    gridTemplateColumns: '40px 1fr auto',
                    alignItems: 'center', gap: 12,
                    transition: 'background 0.15s',
                    background: expanded ? 'var(--bg-glass-hover)' : 'transparent',
                }}
                onMouseEnter={e => { if (!expanded) e.currentTarget.style.background = 'var(--bg-glass-hover)'; }}
                onMouseLeave={e => { if (!expanded) e.currentTarget.style.background = 'transparent'; }}
            >
                {/* Number badge */}
                <div style={{
                    width: 36, height: 36, borderRadius: 'var(--radius-sm)',
                    background: 'var(--gradient-primary)', color: 'white',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.8rem', fontWeight: 700, flexShrink: 0
                }}>
                    {index + 1}
                </div>

                {/* Invoice info */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 20px', alignItems: 'center' }}>
                    <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                        SPB #{invoice.invoiceNumber || '-'}
                    </span>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                        {invoice.customerName || '-'}
                    </span>
                    {invoice.city && (
                        <span className="badge badge-blue" style={{ fontSize: '0.7rem' }}>
                            {invoice.city}
                        </span>
                    )}
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        <Calendar size={12} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                        {invoice.invoiceDate || '-'}
                    </span>
                    <span className="badge badge-blue" style={{ fontSize: '0.7rem' }}>
                        {products.length} produk
                    </span>
                </div>

                {/* Total + chevron */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--accent-emerald)', whiteSpace: 'nowrap' }}>
                        {formatRp(invoice.totalAmount)}
                    </span>
                    {expanded ? <ChevronUp size={18} color="var(--text-muted)" /> : <ChevronDown size={18} color="var(--text-muted)" />}
                </div>
            </div>

            {/* Expanded: product table */}
            {expanded && (
                <div style={{
                    borderTop: '1px solid var(--border-glass)',
                    animation: 'fadeIn 0.2s ease'
                }}>
                    <div style={{ overflowX: 'auto' }}>
                        <table className="data-table" style={{ marginBottom: 0 }}>
                            <thead>
                                <tr>
                                    <th style={{ width: 40 }}>#</th>
                                    <th>Nama Barang</th>
                                    <th style={{ textAlign: 'right' }}>Qty</th>
                                    <th style={{ textAlign: 'right' }}>Harga Satuan</th>
                                    <th style={{ textAlign: 'center' }}>Diskon</th>
                                    <th style={{ textAlign: 'right' }}>Subtotal</th>
                                </tr>
                            </thead>
                            <tbody>
                                {products.map((p, i) => {
                                    const grossAmount = (p.qty || 0) * (p.unitPrice || 0);
                                    const discountAmount = p.discountPercent ? grossAmount * p.discountPercent / 100 : 0;
                                    return (
                                        <tr key={i}>
                                            <td style={{ color: 'var(--text-muted)' }}>{i + 1}</td>
                                            <td style={{ fontWeight: 500 }}>{p.name || '-'}</td>
                                            <td style={{ textAlign: 'right' }}>{(p.qty || 0).toLocaleString('id-ID')}</td>
                                            <td style={{ textAlign: 'right' }}>{formatRp(p.unitPrice)}</td>
                                            <td style={{ textAlign: 'center' }}>
                                                {p.discountPercent ? (
                                                    <div>
                                                        <span className="badge badge-amber" style={{ fontSize: '0.7rem' }}>
                                                            {p.discountPercent}%
                                                        </span>
                                                        <div style={{ fontSize: '0.7rem', color: 'var(--accent-rose)', marginTop: 2 }}>
                                                            -{formatRp(discountAmount)}
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <span style={{ color: 'var(--text-muted)' }}>-</span>
                                                )}
                                            </td>
                                            <td style={{ textAlign: 'right', fontWeight: 600 }}>
                                                {formatRp(p.subtotal)}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                            <tfoot>
                                <tr style={{ background: 'var(--bg-glass-hover)' }}>
                                    <td colSpan={5} style={{ textAlign: 'right', fontWeight: 700, fontSize: '0.85rem' }}>
                                        TOTAL INVOICE
                                    </td>
                                    <td style={{ textAlign: 'right', fontWeight: 700, fontSize: '0.95rem', color: 'var(--accent-emerald)' }}>
                                        {formatRp(invoice.totalAmount)}
                                    </td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>

                    {/* Source badge */}
                    {invoice.source && (
                        <div style={{
                            padding: '8px 20px', fontSize: '0.7rem', color: 'var(--text-muted)',
                            borderTop: '1px solid var(--border-glass)'
                        }}>
                            Sumber: {invoice.source === 'excel_import' ? '📄 Excel Import' : '📷 OCR Scan'}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

// ─── Helpers ───

const labelStyle = {
    display: 'block', fontSize: '0.7rem', fontWeight: 600,
    color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase',
    letterSpacing: '0.05em'
};

const selectStyle = {
    width: '100%', padding: '8px 12px', borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--border-glass)', background: 'var(--bg-card)',
    color: 'var(--text-primary)', fontSize: '0.85rem'
};

function extractMonth(dateStr) {
    if (!dateStr) return '';
    const monthNames = {
        'jan': 'Januari', 'feb': 'Februari', 'mar': 'Maret', 'apr': 'April',
        'mei': 'Mei', 'may': 'Mei', 'jun': 'Juni', 'jul': 'Juli',
        'agu': 'Agustus', 'aug': 'Agustus', 'sep': 'September',
        'okt': 'Oktober', 'oct': 'Oktober', 'nov': 'November',
        'des': 'Desember', 'dec': 'Desember'
    };
    const parts = String(dateStr).split('-');
    if (parts.length >= 3) {
        const m = parts[1].toLowerCase().substring(0, 3);
        let year = parts[2];
        if (year.length === 2) year = '20' + year;
        const monthName = monthNames[m] || parts[1];
        return `${monthName} ${year}`;
    }
    return '';
}

function parseInvDate(dateStr) {
    if (!dateStr) return null;
    const monthMap = {
        'jan': 0, 'feb': 1, 'mar': 2, 'apr': 3, 'mei': 4, 'may': 4, 'jun': 5,
        'jul': 6, 'agu': 7, 'aug': 7, 'sep': 8, 'okt': 9, 'oct': 9, 'nov': 10,
        'des': 11, 'dec': 11
    };
    const parts = String(dateStr).split('-');
    if (parts.length >= 3) {
        const day = parseInt(parts[0]) || 1;
        const mon = monthMap[parts[1].toLowerCase().substring(0, 3)];
        let year = parseInt(parts[2]) || 2025;
        if (year < 100) year += 2000;
        if (mon !== undefined) return new Date(year, mon, day);
    }
    return null;
}
