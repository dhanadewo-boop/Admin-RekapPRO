import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { TrendingUp, AlertCircle, RefreshCw, ChevronDown, ChevronUp, Filter } from 'lucide-react';

const getStatusStyle = (pct, isNonTarget) => {
    if (isNonTarget) return { bg: '#f3f4f6', color: '#6b7280', label: 'NON TARGET', icon: '–' };
    if (pct === null || pct === undefined) return { bg: '#f3f4f6', color: '#9ca3af', label: '–', icon: '–' };
    if (pct >= 100) return { bg: '#dcfce7', color: '#15803d', label: 'LUNAS',  icon: '✓' };
    if (pct >= 80)  return { bg: '#dbeafe', color: '#1d4ed8', label: 'HAMPIR', icon: '◎' };
    if (pct >= 50)  return { bg: '#fef9c3', color: '#a16207', label: 'JALAN',  icon: '◑' };
    if (pct > 0)    return { bg: '#fee2e2', color: '#dc2626', label: 'KURANG', icon: '○' };
    return             { bg: '#f3f4f6', color: '#6b7280', label: 'BELUM',  icon: '–' };
};

const PCT_BAR = (pct) => {
    const capped = Math.min(pct, 100);
    let color = '#ef4444';
    if (pct >= 100) color = '#22c55e';
    else if (pct >= 80) color = '#3b82f6';
    else if (pct >= 50) color = '#f59e0b';
    return { width: `${capped}%`, background: color };
};

const fmt   = (n) => new Intl.NumberFormat('id-ID').format(Math.round(n));
const fmtRp = (n) => 'Rp ' + new Intl.NumberFormat('id-ID').format(Math.round(n));

function ProgressBar({ pct }) {
    const bar = PCT_BAR(pct);
    return (
        <div style={{ width: '100%', height: 6, background: '#e5e7eb', borderRadius: 99, overflow: 'hidden' }}>
            <div style={{ height: '100%', borderRadius: 99, transition: 'width 0.6s ease', ...bar }} />
        </div>
    );
}

function SummaryCard({ label, value, sub, color, icon }) {
    return (
        <div style={{
            background: '#fff', borderRadius: 12, padding: '16px 20px',
            border: `1px solid ${color}30`, borderLeft: `4px solid ${color}`,
            boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
            display: 'flex', alignItems: 'center', gap: 14, flex: 1, minWidth: 160
        }}>
            <div style={{
                width: 40, height: 40, borderRadius: 10, background: `${color}18`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 20, flexShrink: 0
            }}>{icon}</div>
            <div>
                <div style={{ fontSize: '0.7rem', color: '#6b7280', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
                <div style={{ fontSize: '1.3rem', fontWeight: 700, color: '#111827', lineHeight: 1.2 }}>{value}</div>
                {sub && <div style={{ fontSize: '0.72rem', color: '#9ca3af', marginTop: 1 }}>{sub}</div>}
            </div>
        </div>
    );
}

function CustomerBlock({ customer, kota, area, rows, defaultOpen, expandAll }) {
    const [open, setOpen] = useState(defaultOpen);
    useEffect(() => {
        if (expandAll === true)  setOpen(true);
        if (expandAll === false) setOpen(false);
    }, [expandAll]);
    const totalTarget = rows.reduce((s, r) => s + Number(r.target_qty), 0);
    const totalReal   = rows.reduce((s, r) => s + Number(r.realisasi_qty || 0), 0);
    const totalRp     = rows.reduce((s, r) => s + Number(r.realisasi_rupiah || 0), 0);
    const isNonTarget = area === 'NON TARGET';
    const overallPct  = totalTarget > 0 ? (totalReal / totalTarget) * 100 : null;
    const status      = getStatusStyle(overallPct, isNonTarget);

    return (
        <div style={{ background: '#fff', borderRadius: 12, overflow: 'hidden', border: '1px solid #e5e7eb', boxShadow: '0 1px 4px rgba(0,0,0,0.05)', marginBottom: 12 }}>
            <button onClick={() => setOpen(o => !o)} style={{
                width: '100%', padding: '14px 20px',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                background: open ? '#f8fafc' : '#fff',
                borderBottom: open ? '1px solid #e5e7eb' : 'none',
                cursor: 'pointer', textAlign: 'left', gap: 12
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: status.color, flexShrink: 0 }} />
                    <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: '0.92rem', color: '#111827', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {customer}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: '#9ca3af' }}>
                            {area === 'NON TARGET' ? '' : area + ' · '}{kota || ''}{kota ? ' · ' : ''}{rows.length} produk
                        </div>
                    </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexShrink: 0 }}>
                    <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', gap: 4, minWidth: 120 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'flex-end' }}>
                            <span style={{ fontSize: '0.68rem', fontWeight: 700, padding: '1px 6px', borderRadius: 99, background: status.bg, color: status.color }}>{status.label}</span>
                            <span style={{ fontSize: '0.9rem', fontWeight: 700, color: status.color }}>
                                 {overallPct !== null ? overallPct.toFixed(1) + '%' : '0%'}
                                </span>
                        </div>
                        <ProgressBar pct={overallPct} />
                        <div style={{ fontSize: '0.68rem', color: '#9ca3af' }}>{fmt(totalReal)} / {fmt(totalTarget)} DUS</div>
                    </div>
                    <div style={{ textAlign: 'right', minWidth: 100 }}>
                        <div style={{ fontSize: '0.68rem', color: '#9ca3af' }}>Realisasi</div>
                        <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#374151' }}>{fmtRp(totalRp)}</div>
                    </div>
                    <div style={{ color: '#9ca3af' }}>{open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}</div>
                </div>
            </button>

            {open && (
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                        <thead>
                            <tr style={{ background: '#f8fafc' }}>
                                <th style={TH}>PRODUK</th>
                                <th style={{ ...TH, textAlign: 'center' }}>SATUAN</th>
                                <th style={{ ...TH, textAlign: 'right' }}>TARGET</th>
                                <th style={{ ...TH, textAlign: 'right' }}>REALISASI</th>
                                <th style={{ ...TH, textAlign: 'right' }}>SISA</th>
                                <th style={{ ...TH, textAlign: 'right' }}>NILAI (Rp)</th>
                                <th style={{ ...TH, textAlign: 'center', minWidth: 140 }}>PENCAPAIAN</th>
                                <th style={{ ...TH, textAlign: 'center' }}>STATUS</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((r, i) => {
                                const pct  = r.pct_capai !== null && r.pct_capai !== undefined ? Number(r.pct_capai) : null;
                                const sisa = Number(r.target_qty) - Number(r.realisasi_qty || 0);
                                const st   = getStatusStyle(pct);
                                return (
                                    <tr key={i} style={{ borderTop: '1px solid #f3f4f6', background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                                        <td style={{ ...TD, fontWeight: 600, color: '#374151' }}>{r.product_name}</td>
                                        <td style={{ ...TD, textAlign: 'center', color: '#6b7280' }}>{r.satuan}</td>
                                        <td style={{ ...TD, textAlign: 'right', fontWeight: 600 }}>{fmt(r.target_qty)}</td>
                                        <td style={{ ...TD, textAlign: 'right', color: pct > 0 ? '#15803d' : '#374151', fontWeight: pct > 0 ? 600 : 400 }}>{fmt(r.realisasi_qty || 0)}</td>
                                        <td style={{ ...TD, textAlign: 'right', color: sisa > 0 ? '#dc2626' : '#15803d', fontWeight: 600 }}>{sisa > 0 ? fmt(sisa) : '✓'}</td>
                                        <td style={{ ...TD, textAlign: 'right', color: '#374151' }}>{fmtRp(r.realisasi_rupiah || 0)}</td>
                                        <td style={{ ...TD, textAlign: 'center' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                {pct !== null && <ProgressBar pct={pct} />}
                                                <span style={{ fontSize: '0.78rem', fontWeight: 700, color: st.color, minWidth: 40, textAlign: 'right' }}>{pct !== null ? pct.toFixed(1) + '%' : '–'}</span>
                                            </div>
                                        </td>
                                        <td style={{ ...TD, textAlign: 'center' }}>
                                            <span style={{ fontSize: '0.68rem', fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: st.bg, color: st.color, whiteSpace: 'nowrap' }}>{st.icon} {st.label}</span>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                        <tfoot>
                            <tr style={{ background: '#f1f5f9', borderTop: '2px solid #e2e8f0' }}>
                                <td style={{ ...TD, fontWeight: 700, color: '#1e293b' }} colSpan={2}>TOTAL</td>
                                <td style={{ ...TD, textAlign: 'right', fontWeight: 700 }}>{fmt(totalTarget)}</td>
                                <td style={{ ...TD, textAlign: 'right', fontWeight: 700, color: '#15803d' }}>{fmt(totalReal)}</td>
                                <td style={{ ...TD, textAlign: 'right', fontWeight: 700, color: (totalTarget - totalReal) > 0 ? '#dc2626' : '#15803d' }}>
                                    {(totalTarget - totalReal) > 0 ? fmt(totalTarget - totalReal) : '✓ LUNAS'}
                                </td>
                                <td style={{ ...TD, textAlign: 'right', fontWeight: 700 }}>{fmtRp(totalRp)}</td>
                                <td style={{ ...TD, textAlign: 'center' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                        {overallPct !== null && <ProgressBar pct={overallPct} />}
                                        <span style={{ fontSize: '0.8rem', fontWeight: 800, color: status.color, minWidth: 40, textAlign: 'right' }}>{overallPct !== null ? overallPct.toFixed(1) + '%' : '–'}</span>
                                    </div>
                                </td>
                                <td style={{ ...TD, textAlign: 'center' }}>
                                    <span style={{ fontSize: '0.7rem', fontWeight: 800, padding: '2px 8px', borderRadius: 99, background: status.bg, color: status.color }}>{status.label}</span>
                                </td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            )}
        </div>
    );
}

const TH = { padding: '8px 14px', fontWeight: 700, fontSize: '0.7rem', color: '#475569', textAlign: 'left', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' };
const TD = { padding: '9px 14px', verticalAlign: 'middle' };

const AREAS = ['Semua', 'AREA 1', 'AREA 2', 'AREA 3', 'AREA 4', 'AREA 5', 'NON TARGET'];
const AREA_LABELS = {
    'AREA 1': 'Area 1 – Jombang',
    'AREA 2': 'Area 2 – Nganjuk/Ponorogo',
    'AREA 3': 'Area 3 – Jember',
    'AREA 4': 'Area 4 – Banyuwangi',
    'AREA 5': 'Area 5 – Malang',
    'NON TARGET': 'Non Target',
};


function ProdukBlock({ product, satuan, customers, totalTarget, totalRealisasi, totalRupiah, overallPct, st, expandAll }) {
    const [open, setOpen] = useState(true);
    useEffect(() => {
        if (expandAll === true)  setOpen(true);
        if (expandAll === false) setOpen(false);
    }, [expandAll]);

    return (
        <div style={{ background: '#fff', borderRadius: 12, overflow: 'hidden', border: '1px solid #e5e7eb', boxShadow: '0 1px 4px rgba(0,0,0,0.05)', marginBottom: 12 }}>
            <button onClick={() => setOpen(o => !o)} style={{
                width: '100%', padding: '14px 20px',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                background: open ? '#f8fafc' : '#fff',
                borderBottom: open ? '1px solid #e5e7eb' : 'none',
                cursor: 'pointer', textAlign: 'left', gap: 12
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: st.color, flexShrink: 0 }} />
                    <div>
                        <div style={{ fontWeight: 700, fontSize: '0.92rem', color: '#111827' }}>{product}</div>
                        <div style={{ fontSize: '0.72rem', color: '#9ca3af' }}>{customers.length} customer · target {fmt(totalTarget)} {satuan}</div>
                    </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexShrink: 0 }}>
                    <div style={{ textAlign: 'right', minWidth: 120 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'flex-end', marginBottom: 4 }}>
                            <span style={{ fontSize: '0.68rem', fontWeight: 700, padding: '1px 6px', borderRadius: 99, background: st.bg, color: st.color }}>{st.label}</span>
                            <span style={{ fontSize: '0.9rem', fontWeight: 700, color: st.color }}>{overallPct !== null ? overallPct.toFixed(1) + '%' : '0%'}</span>
                        </div>
                        <ProgressBar pct={overallPct ?? 0} />
                        <div style={{ fontSize: '0.68rem', color: '#9ca3af', marginTop: 4 }}>{fmt(totalRealisasi)} / {fmt(totalTarget)} {satuan}</div>
                    </div>
                    <div style={{ textAlign: 'right', minWidth: 100 }}>
                        <div style={{ fontSize: '0.68rem', color: '#9ca3af' }}>Realisasi</div>
                        <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#374151' }}>{fmtRp(totalRupiah)}</div>
                    </div>
                    <div style={{ color: '#9ca3af' }}>{open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}</div>
                </div>
            </button>

            {open && (
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                        <thead>
                            <tr style={{ background: '#f8fafc' }}>
                                <th style={TH}>CUSTOMER</th>
                                <th style={{ ...TH }}>AREA</th>
                                <th style={{ ...TH, textAlign: 'right' }}>TARGET ({satuan})</th>
                                <th style={{ ...TH, textAlign: 'right' }}>REALISASI</th>
                                <th style={{ ...TH, textAlign: 'right' }}>SISA</th>
                                <th style={{ ...TH, textAlign: 'right' }}>NILAI (Rp)</th>
                                <th style={{ ...TH, textAlign: 'center', minWidth: 140 }}>PENCAPAIAN</th>
                                <th style={{ ...TH, textAlign: 'center' }}>STATUS</th>
                            </tr>
                        </thead>
                        <tbody>
                            {customers.map((c, i) => {
                                const pct  = c.target > 0 ? (c.realisasi / c.target) * 100 : null;
                                const sisa = c.target - c.realisasi;
                                const cst  = getStatusStyle(pct, c.area === 'NON TARGET');
                                return (
                                    <tr key={i} style={{ borderTop: '1px solid #f3f4f6', background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                                        <td style={{ ...TD, fontWeight: 600, color: '#374151' }}>{c.customer}</td>
                                        <td style={{ ...TD, color: '#6b7280', fontSize: '0.78rem' }}>{c.area}</td>
                                        <td style={{ ...TD, textAlign: 'right', fontWeight: 600 }}>{c.target > 0 ? fmt(c.target) : '–'}</td>
                                        <td style={{ ...TD, textAlign: 'right', color: pct > 0 ? '#15803d' : '#374151', fontWeight: pct > 0 ? 600 : 400 }}>{fmt(c.realisasi)}</td>
                                        <td style={{ ...TD, textAlign: 'right', color: sisa > 0 ? '#dc2626' : '#15803d', fontWeight: 600 }}>{c.target > 0 ? (sisa > 0 ? fmt(sisa) : '✓') : '–'}</td>
                                        <td style={{ ...TD, textAlign: 'right' }}>{fmtRp(c.rupiah)}</td>
                                        <td style={{ ...TD }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                {pct !== null && <ProgressBar pct={pct} />}
                                                <span style={{ fontSize: '0.78rem', fontWeight: 700, color: cst.color, minWidth: 40, textAlign: 'right' }}>{pct !== null ? pct.toFixed(1) + '%' : '–'}</span>
                                            </div>
                                        </td>
                                        <td style={{ ...TD, textAlign: 'center' }}>
                                            <span style={{ fontSize: '0.68rem', fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: cst.bg, color: cst.color }}>{cst.icon} {cst.label}</span>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                        <tfoot>
                            <tr style={{ background: '#f1f5f9', borderTop: '2px solid #e2e8f0' }}>
                                <td style={{ ...TD, fontWeight: 700, color: '#1e293b' }} colSpan={2}>TOTAL</td>
                                <td style={{ ...TD, textAlign: 'right', fontWeight: 700 }}>{fmt(totalTarget)}</td>
                                <td style={{ ...TD, textAlign: 'right', fontWeight: 700, color: '#15803d' }}>{fmt(totalRealisasi)}</td>
                                <td style={{ ...TD, textAlign: 'right', fontWeight: 700, color: (totalTarget - totalRealisasi) > 0 ? '#dc2626' : '#15803d' }}>
                                    {(totalTarget - totalRealisasi) > 0 ? fmt(totalTarget - totalRealisasi) : '✓ LUNAS'}
                                </td>
                                <td style={{ ...TD, textAlign: 'right', fontWeight: 700 }}>{fmtRp(totalRupiah)}</td>
                                <td style={{ ...TD }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                        {overallPct !== null && <ProgressBar pct={overallPct} />}
                                        <span style={{ fontSize: '0.8rem', fontWeight: 800, color: st.color, minWidth: 40, textAlign: 'right' }}>{overallPct !== null ? overallPct.toFixed(1) + '%' : '–'}</span>
                                    </div>
                                </td>
                                <td style={{ ...TD, textAlign: 'center' }}>
                                    <span style={{ fontSize: '0.7rem', fontWeight: 800, padding: '2px 8px', borderRadius: 99, background: st.bg, color: st.color }}>{st.label}</span>
                                </td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            )}
        </div>
    );
}

export default function ProgramTargetPage() {
    const [data, setData]               = useState([]);
    const [loading, setLoading]         = useState(true);
    const [error, setError]             = useState(null);
    const [filterArea, setFilterArea]   = useState('Semua');
    const [filterStatus, setFilterStatus] = useState('Semua');
    const [tahun, setTahun] = useState(new Date().getFullYear()); // Otomatis tahun berjalan (2026)
    const [lastRefresh, setLastRefresh] = useState(null);
    const [expandAll, setExpandAll]     = useState(null);  // null=default tertutup, true=buka semua, false=tutup semua
    const [activeTab, setActiveTab]     = useState('customer'); // 'customer' | 'produk'
    const [satuan, setSatuan]           = useState('DUS');      // 'DUS' | 'LITER' | 'KG'

    const fetchData = async () => {
        setLoading(true); setError(null);
        try {
            const { data: rows, error: err } = await supabase
                .from('v_program_target')
                .select('*')
                .eq('tahun', tahun)
                .order('area')
                .order('customer_name')
                .order('product_name');
            if (err) throw err;
            setData(rows || []);
            setLastRefresh(new Date());
        } catch (e) { setError(e.message); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchData(); }, [tahun]);

    const grouped = useMemo(() => {
        const map = {};
        data.forEach(row => {
            const key = row.customer_name;
            if (!map[key]) map[key] = { customer: key, kota: row.kota, area: row.area || '–', rows: [] };
            map[key].rows.push(row);
        });
        return Object.values(map);
    }, [data]);

    const filtered = useMemo(() => {
        return grouped.filter(g => {
            if (filterArea !== 'Semua' && g.area !== filterArea) return false;
            if (filterStatus !== 'Semua') {
                const t = g.rows.reduce((s, r) => s + Number(r.target_qty), 0);
                const r = g.rows.reduce((s, r2) => s + Number(r2.realisasi_qty || 0), 0);
                const pct = t > 0 ? (r / t) * 100 : 0;
                if (filterStatus === 'Lunas'      && pct < 100) return false;
                if (filterStatus === 'Belum Lunas'&& pct >= 100) return false;
                if (filterStatus === '>80%'        && pct < 80)  return false;
                if (filterStatus === '<50%'        && pct >= 50) return false;
            }
            return true;
        });
    }, [grouped, filterArea, filterStatus]);

    const stats = useMemo(() => {
        const totalTarget = data.reduce((s, r) => s + Number(r.target_qty), 0);
        const totalReal   = data.reduce((s, r) => s + Number(r.realisasi_qty || 0), 0);
        const totalRp     = data.reduce((s, r) => s + Number(r.realisasi_rupiah || 0), 0);
        const overallPct  = totalTarget > 0 ? (totalReal / totalTarget) * 100 : 0;
        const lunas       = grouped.filter(g => {
            const t = g.rows.reduce((s, r) => s + Number(r.target_qty), 0);
            const r = g.rows.reduce((s, r2) => s + Number(r2.realisasi_qty || 0), 0);
            return t > 0 && r / t >= 1;
        }).length;
        return { totalTarget, totalReal, totalRp, overallPct, lunas };
    }, [data, grouped]);

    const rekapProduk = useMemo(() => {
        const map = {};
        data.forEach(r => {
            const k = r.product_name;
            if (!map[k]) map[k] = { product: k, satuan: r.satuan, target: 0, realisasi: 0, rupiah: 0 };
            map[k].target    += Number(r.target_qty);
            map[k].realisasi += Number(r.realisasi_qty || 0);
            map[k].rupiah    += Number(r.realisasi_rupiah || 0);
        });
        return Object.values(map).sort((a, b) => b.target - a.target);
    }, [data]);

    // Tab 2: grouped per produk → per customer
    const groupedByProduk = useMemo(() => {
        const map = {};
        data.forEach(r => {
            const k = r.product_name;
            if (!map[k]) map[k] = { product: k, satuan: r.satuan, customers: {} };
            if (!map[k].customers[r.customer_name]) {
                map[k].customers[r.customer_name] = {
                    customer: r.customer_name, area: r.area, kota: r.kota,
                    target: 0, realisasi: 0, rupiah: 0
                };
            }
            map[k].customers[r.customer_name].target    += Number(r.target_qty);
            map[k].customers[r.customer_name].realisasi += Number(r.realisasi_qty || 0);
            map[k].customers[r.customer_name].rupiah    += Number(r.realisasi_rupiah || 0);
        });
        return Object.values(map)
            .map(p => ({ ...p, customers: Object.values(p.customers).sort((a,b) => b.target - a.target) }))
            .sort((a, b) => {
                const ta = a.customers.reduce((s,c) => s+c.target, 0);
                const tb = b.customers.reduce((s,c) => s+c.target, 0);
                return tb - ta;
            });
    }, [data]);

    return (
        <div style={{ padding: '24px 28px', maxWidth: 1200, margin: '0 auto' }}>

            {/* Header */}
            <div style={{ marginBottom: 24, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                <div>
                    <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#111827', marginBottom: 4 }}>📊 Program Target {tahun}</h2>
                    <p style={{ fontSize: '0.8rem', color: '#9ca3af' }}>
                        Rekap pencapaian target per customer per produk
                        {lastRefresh && ` · Diperbarui ${lastRefresh.toLocaleTimeString('id-ID')}`}
                    </p>
                </div>
                <button onClick={fetchData} disabled={loading} style={{
                    display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px',
                    borderRadius: 8, fontSize: '0.82rem', background: '#3b82f6', color: '#fff',
                    fontWeight: 600, opacity: loading ? 0.6 : 1, cursor: loading ? 'not-allowed' : 'pointer', border: 'none'
                }}>
                    <RefreshCw size={14} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
                    Refresh
                </button>
            </div>

            {error && (
                <div style={{ padding: '12px 16px', borderRadius: 8, background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', fontSize: '0.85rem', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <AlertCircle size={16} />
                    <span><strong>Gagal memuat data:</strong> {error}</span>
                </div>
            )}

            {/* Tab Navigation + Toggle Satuan */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, marginBottom: 20 }}>
                <div style={{ display: 'flex', gap: 6, background: '#f1f5f9', padding: 4, borderRadius: 10 }}>
                    {[['customer','Per Customer'],['produk','Per Produk']].map(([key, label]) => (
                        <button key={key} onClick={() => setActiveTab(key)} style={{
                            padding: '6px 18px', borderRadius: 8, fontSize: '0.82rem', fontWeight: 600,
                            border: 'none', cursor: 'pointer',
                            background: activeTab === key ? '#fff' : 'transparent',
                            color: activeTab === key ? '#1d4ed8' : '#6b7280',
                            boxShadow: activeTab === key ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
                            transition: 'all 0.15s'
                        }}>{label}</button>
                    ))}
                </div>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center', background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: '5px 10px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                    <span style={{ fontSize: '0.72rem', color: '#6b7280', fontWeight: 700, letterSpacing: '0.05em' }}>SATUAN:</span>
                    {['DUS','LITER','KG'].map(s => (
                        <button key={s} onClick={() => setSatuan(s)} style={{
                            padding: '6px 16px', borderRadius: 8, fontSize: '0.8rem', fontWeight: 700,
                            border: 'none', cursor: 'pointer', transition: 'all 0.15s',
                            background: satuan === s ? '#f59e0b' : 'transparent',
                            color: satuan === s ? '#fff' : '#9ca3af',
                            boxShadow: satuan === s ? '0 2px 6px rgba(245,158,11,0.4)' : 'none',
                        }}>{s}</button>
                    ))}
                </div>
            </div>

            {/* Summary Cards */}
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 24 }}>
                <SummaryCard label="Total Target"     value={`${fmt(stats.totalTarget)} DUS`} sub={`${data.filter(r => r.target_qty > 0).length} item target`} color="#3b82f6" icon="🎯" />
                <SummaryCard label="Realisasi"        value={`${fmt(stats.totalReal)} DUS`}   sub={`${stats.overallPct.toFixed(1)}% dari total target`}       color="#22c55e" icon="📦" />
                <SummaryCard label="Nilai Penjualan"  value={fmtRp(stats.totalRp)}             sub="Dari invoice terkonfirmasi"                                color="#f59e0b" icon="💰" />
                <SummaryCard label="Customer Lunas"   value={`${stats.lunas} / ${grouped.length}`} sub="Sudah ≥100% pencapaian"                               color="#8b5cf6" icon="🏆" />
            </div>

            {/* Overall progress */}
            <div style={{ background: '#fff', borderRadius: 12, padding: '16px 20px', border: '1px solid #e5e7eb', marginBottom: 20, boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#374151' }}>Pencapaian Keseluruhan {tahun}</span>
                    <span style={{ fontSize: '0.9rem', fontWeight: 800, color: getStatusStyle(stats.overallPct).color }}>{stats.overallPct.toFixed(2)}%</span>
                </div>
                <div style={{ height: 10, background: '#e5e7eb', borderRadius: 99, overflow: 'hidden' }}>
                    <div style={{ height: '100%', borderRadius: 99, transition: 'width 1s ease', ...PCT_BAR(stats.overallPct) }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: '0.72rem', color: '#9ca3af' }}>
                    <span>0</span>
                    <span>{fmt(stats.totalReal)} DUS terealisasi dari {fmt(stats.totalTarget)} DUS target</span>
                    <span>{fmt(stats.totalTarget)}</span>
                </div>
            </div>

            {/* Filter AREA */}
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 16, flexWrap: 'wrap' }}>
                <Filter size={14} style={{ color: '#9ca3af' }} />
                <span style={{ fontSize: '0.78rem', color: '#9ca3af', fontWeight: 600 }}>AREA:</span>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {AREAS.map(a => (
                        <button key={a} onClick={() => setFilterArea(a)} style={{
                            padding: '4px 12px', borderRadius: 99, fontSize: '0.78rem', fontWeight: 600,
                            border: '1px solid', cursor: 'pointer',
                            borderColor: filterArea === a ? '#3b82f6' : '#e5e7eb',
                            background:  filterArea === a ? '#eff6ff'  : '#fff',
                            color:        filterArea === a ? '#3b82f6'  : '#6b7280',
                        }}>
                            {a === 'Semua' ? 'Semua Area' : (AREA_LABELS[a] || a)}
                        </button>
                    ))}
                </div>
                <div style={{ width: 1, height: 20, background: '#e5e7eb' }} />
                <span style={{ fontSize: '0.78rem', color: '#9ca3af', fontWeight: 600 }}>STATUS:</span>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {['Semua', 'Lunas', '>80%', 'Belum Lunas', '<50%'].map(s => (
                        <button key={s} onClick={() => setFilterStatus(s)} style={{
                            padding: '4px 12px', borderRadius: 99, fontSize: '0.78rem', fontWeight: 600,
                            border: '1px solid', cursor: 'pointer',
                            borderColor: filterStatus === s ? '#8b5cf6' : '#e5e7eb',
                            background:  filterStatus === s ? '#f5f3ff'  : '#fff',
                            color:        filterStatus === s ? '#8b5cf6'  : '#6b7280',
                        }}>{s}</button>
                    ))}
                </div>
            </div>

            {/* Buka / Tutup Semua */}
            {!loading && filtered.length > 0 && (
                <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                    <button onClick={() => setExpandAll(true)} style={{
                        padding: '5px 14px', borderRadius: 8, fontSize: '0.78rem', fontWeight: 600,
                        border: '1px solid #e5e7eb', background: '#fff', color: '#374151', cursor: 'pointer'
                    }}>▾ Buka Semua</button>
                    <button onClick={() => setExpandAll(false)} style={{
                        padding: '5px 14px', borderRadius: 8, fontSize: '0.78rem', fontWeight: 600,
                        border: '1px solid #e5e7eb', background: '#fff', color: '#374151', cursor: 'pointer'
                    }}>▸ Tutup Semua</button>
                </div>
            )}

            {loading && (
                <div style={{ textAlign: 'center', padding: 60, color: '#9ca3af' }}>
                    <div style={{ fontSize: '2rem', marginBottom: 10 }}>⏳</div>
                    <p style={{ fontSize: '0.85rem' }}>Memuat data program target...</p>
                </div>
            )}

            {!loading && !error && filtered.length === 0 && (
                <div style={{ textAlign: 'center', padding: 60, background: '#fff', borderRadius: 12, border: '1px dashed #e5e7eb', color: '#9ca3af' }}>
                    <div style={{ fontSize: '2.5rem', marginBottom: 10 }}>📋</div>
                    <p style={{ fontWeight: 600, color: '#374151' }}>Tidak ada data</p>
                </div>
            )}

            {/* TAB 1: Per Customer */}
            {!loading && activeTab === 'customer' && filtered.map((g, i) => (
                <CustomerBlock key={g.customer} customer={g.customer} kota={g.kota} area={g.area} rows={g.rows} defaultOpen={false} expandAll={expandAll} />
            ))}

            {/* TAB 2: Per Produk → Per Customer */}
            {!loading && activeTab === 'produk' && (
                <div>
                    {groupedByProduk.map((p, pi) => {
                        const totalTarget   = p.customers.reduce((s, c) => s + c.target, 0);
                        const totalRealisasi = p.customers.reduce((s, c) => s + c.realisasi, 0);
                        const totalRupiah   = p.customers.reduce((s, c) => s + c.rupiah, 0);
                        const overallPct    = totalTarget > 0 ? (totalRealisasi / totalTarget) * 100 : null;
                        const st            = getStatusStyle(overallPct, false);
                        const [open, setOpen] = [true, () => {}]; // always show inline — use local state via key
                        return (
                            <ProdukBlock key={p.product} product={p.product} satuan={satuan}
                                customers={p.customers} totalTarget={totalTarget}
                                totalRealisasi={totalRealisasi} totalRupiah={totalRupiah}
                                overallPct={overallPct} st={st} expandAll={expandAll} />
                        );
                    })}
                </div>
            )}

            {/* Rekap per Produk */}
            {!loading && rekapProduk.length > 0 && (
                <div style={{ background: '#fff', borderRadius: 12, marginTop: 28, border: '1px solid #e5e7eb', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                    <div style={{ padding: '14px 20px', borderBottom: '1px solid #e5e7eb', background: '#f8fafc', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <TrendingUp size={16} style={{ color: '#3b82f6' }} />
                        <h3 style={{ fontWeight: 700, fontSize: '0.9rem', color: '#111827' }}>Rekap per Produk — Semua Customer</h3>
                    </div>
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                            <thead>
                                <tr style={{ background: '#f8fafc' }}>
                                    <th style={TH}>PRODUK</th>
                                    <th style={{ ...TH, textAlign: 'right' }}>TOTAL TARGET</th>
                                    <th style={{ ...TH, textAlign: 'right' }}>REALISASI</th>
                                    <th style={{ ...TH, textAlign: 'right' }}>SISA</th>
                                    <th style={{ ...TH, textAlign: 'right' }}>NILAI (Rp)</th>
                                    <th style={{ ...TH, textAlign: 'center', minWidth: 160 }}>PENCAPAIAN</th>
                                </tr>
                            </thead>
                            <tbody>
                                {rekapProduk.map((p, i) => {
                                    const pct  = p.target > 0 ? (p.realisasi / p.target) * 100 : 0;
                                    const sisa = p.target - p.realisasi;
                                    const st   = getStatusStyle(pct);
                                    return (
                                        <tr key={i} style={{ borderTop: '1px solid #f3f4f6', background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                                            <td style={{ ...TD, fontWeight: 700, color: '#374151' }}>{p.product}</td>
                                            <td style={{ ...TD, textAlign: 'right' }}>{fmt(p.target)}</td>
                                            <td style={{ ...TD, textAlign: 'right', color: pct > 0 ? '#15803d' : '#374151', fontWeight: 600 }}>{fmt(p.realisasi)}</td>
                                            <td style={{ ...TD, textAlign: 'right', color: sisa > 0 ? '#dc2626' : '#15803d', fontWeight: 600 }}>{sisa > 0 ? fmt(sisa) : '✓'}</td>
                                            <td style={{ ...TD, textAlign: 'right' }}>{fmtRp(p.rupiah)}</td>
                                            <td style={{ ...TD }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                    <ProgressBar pct={pct} />
                                                    <span style={{ fontSize: '0.8rem', fontWeight: 700, color: st.color, minWidth: 44, textAlign: 'right' }}>{pct.toFixed(1)}%</span>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Legend */}
            <div style={{ marginTop: 20, padding: '10px 16px', background: '#f8fafc', borderRadius: 8, border: '1px solid #e5e7eb', display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: '0.72rem', color: '#6b7280' }}>
                <span style={{ fontWeight: 600, color: '#374151' }}>Keterangan:</span>
                {[
                    { s: getStatusStyle(100), l: '≥ 100% Lunas' },
                    { s: getStatusStyle(85),  l: '80–99% Hampir' },
                    { s: getStatusStyle(60),  l: '50–79% Jalan' },
                    { s: getStatusStyle(25),  l: '1–49% Kurang' },
                    { s: getStatusStyle(0),   l: '0% Belum' },
                ].map(({ s, l }, i) => (
                    <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: s.color }} />
                        {l}
                    </span>
                ))}
            </div>

            <style>{`
                @keyframes spin    { from { transform: rotate(0deg); }   to { transform: rotate(360deg); } }
                @keyframes fadeIn  { from { opacity:0; transform: translateY(4px); } to { opacity:1; transform: translateY(0); } }
            `}</style>
        </div>
    );
}