import { useState, useEffect, useMemo } from 'react';
import { subscribeInvoices } from '../lib/db';
import { exportRekapToExcel } from '../lib/excelExport';
import {
    FileText, Download, Search, Filter, X,
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

    // ─── Render ───
    return (
        <div className="animate-fade-in">
            {/* Header */}
            <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
                <div>
                    <h1>Rekap Penjualan</h1>
                    <p>Data penjualan dikelompokkan per invoice</p>
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
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
