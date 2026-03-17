import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { TrendingUp, AlertCircle, RefreshCw, ChevronDown, ChevronUp, Filter } from 'lucide-react';

const getStatusStyle = (pct, isNonTarget) => {
    if (isNonTarget) return { bg: '#f3f4f6', color: '#6b7280', label: 'NON TARGET', icon: '–' };
    if (pct === null || pct === undefined) return { bg: '#f3f4f6', color: '#9ca3af', label: '–', icon: '–' };
    if (pct >= 100) return { bg: '#dcfce7', color: '#15803d', label: 'TERCAPAI',  icon: '✓' };
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

// Konversi REALISASI saja ke satuan toggle
// Target TIDAK dikonversi — selalu dalam satuan asli (r.satuan dari product_targets)
// % selalu dihitung target_qty vs realisasi_qty dalam DUS (satuan asli, apple-to-apple)
const konversiRealisasi = (qty_dus, satuan_toggle, row) => {
    if (satuan_toggle === 'DUS') return qty_dus;
    if (satuan_toggle === 'LITER' && row.liter_per_dus) return qty_dus * Number(row.liter_per_dus);
    if (satuan_toggle === 'KG'    && row.kg_per_dus)    return qty_dus * Number(row.kg_per_dus);
    return null; // produk ini tidak punya konversi untuk satuan toggle ini
};

// Label satuan realisasi — bisa beda dengan satuan target
const satuanRealisasiLabel = (satuan_toggle, row) => {
    if (satuan_toggle === 'DUS') return 'DUS';
    if (satuan_toggle === 'LITER' && row.liter_per_dus) return 'LITER';
    if (satuan_toggle === 'KG'    && row.kg_per_dus)    return 'KG';
    return 'DUS'; // fallback ke DUS kalau tidak ada faktor konversi
};

// % pencapaian selalu dalam DUS (satuan asli) — tidak terpengaruh toggle
const hitungPct = (target_qty, realisasi_qty) => {
    if (!target_qty || target_qty <= 0) return null;
    return (Number(realisasi_qty || 0) / Number(target_qty)) * 100;
};

// konversiRows untuk CustomerBlock — realisasi saja yang dikonversi
const konversiRows = (rows, satuan_toggle) => rows.map(r => ({
    ...r,
    _real_konversi:  konversiRealisasi(Number(r.realisasi_qty || 0), satuan_toggle, r),
    _satuan_real:    satuanRealisasiLabel(satuan_toggle, r),
    _pct:            hitungPct(r.target_qty, r.realisasi_qty), // selalu DUS
}));

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
    const [satuan, setSatuan] = useState('DUS'); // toggle per-accordion
    useEffect(() => {
        if (expandAll === true)  setOpen(true);
        if (expandAll === false) setOpen(false);
    }, [expandAll]);
    const convRows    = konversiRows(rows, satuan);
    // Target dalam DUS (satuan asli), tidak dikonversi
    const totalTarget = rows.reduce((s, r) => s + Number(r.target_qty), 0);
    // Realisasi dalam DUS untuk % pencapaian
    const totalRealDUS = rows.reduce((s, r) => s + Number(r.realisasi_qty || 0), 0);
    // Realisasi dalam satuan toggle untuk display
    const totalRealDisplay = convRows.reduce((s, r) => s + (r._real_konversi ?? Number(r.realisasi_qty || 0)), 0);
    const totalRp     = rows.reduce((s, r) => s + Number(r.realisasi_rupiah || 0), 0);
    const isNonTarget = area === 'NON TARGET';
    // % selalu DUS vs DUS
    const overallPct  = totalTarget > 0 ? (totalRealDUS / totalTarget) * 100 : null;
    // Sortir produk: % pencapaian tertinggi dulu (tanpa grup toggle)
    const sortedRows = [...convRows].sort((a, b) => {
        const pA = a._pct ?? 0;
        const pB = b._pct ?? 0;
        return pB - pA;
    });
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
                        <div style={{ fontSize: '0.68rem', color: '#9ca3af' }}>
                            {satuan !== 'DUS' && convRows[0]?._real_konversi != null
                                ? <>{fmt(totalRealDisplay)} {satuan} <span style={{color:'#d1d5db'}}>({fmt(totalRealDUS)} DUS)</span></>
                                : <>{fmt(totalRealDUS)} / {fmt(totalTarget)} DUS</>
                            }
                        </div>
                    </div>
                    <div style={{ textAlign: 'right', minWidth: 100 }}>
                        <div style={{ fontSize: '0.68rem', color: '#9ca3af' }}>Realisasi</div>
                        <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#374151' }}>{fmtRp(totalRp)}</div>
                    </div>
                    <div style={{ color: '#9ca3af' }}>{open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}</div>
                </div>
            </button>
            {/* Toggle satuan per-accordion — hanya tampil saat terbuka */}
            {open && !isNonTarget && (
                <div style={{ display: 'flex', gap: 4, padding: '6px 20px', background: '#f8fafc', borderBottom: '1px solid #e5e7eb', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.7rem', color: '#9ca3af', fontWeight: 600, marginRight: 4 }}>SATUAN:</span>
                    {['DUS','LITER','KG'].map(s => (
                        <button key={s} onClick={e => { e.stopPropagation(); setSatuan(s); }} style={{
                            padding: '3px 10px', borderRadius: 6, fontSize: '0.72rem', fontWeight: 700,
                            border: 'none', cursor: 'pointer', transition: 'all 0.15s',
                            background: satuan === s ? '#f59e0b' : '#e5e7eb',
                            color: satuan === s ? '#fff' : '#6b7280',
                            boxShadow: satuan === s ? '0 1px 4px rgba(245,158,11,0.35)' : 'none',
                        }}>{s}</button>
                    ))}
                    {satuan !== 'DUS' && (
                        <span style={{ fontSize: '0.68rem', color: '#f59e0b', marginLeft: 6, fontStyle: 'italic' }}>
                            Target tetap DUS · % vs DUS
                        </span>
                    )}
                </div>
            )}

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
                            {(() => {
                                // Cek apakah ada produk dengan satuan berbeda (LITER vs KG)
                                const satuanGroups = [...new Set(sortedRows.map(r => r.satuan))];
                                const hasMultiSatuan = satuanGroups.length > 1;
                                const rows_with_headers = [];

                                if (hasMultiSatuan) {
                                    // Tampilkan sub-header per satuan
                                    satuanGroups.forEach(sat => {
                                        const groupRows = sortedRows.filter(r => r.satuan === sat);
                                        if (groupRows.length === 0) return;
                                        // Sub-header
                                        rows_with_headers.push(
                                            <tr key={`sat-hdr-${sat}`} style={{ background: sat === 'LITER' ? '#eff6ff' : sat === 'KG' ? '#fef9c3' : '#f1f5f9' }}>
                                                <td colSpan={8} style={{
                                                    padding: '5px 14px', fontWeight: 700, fontSize: '0.72rem',
                                                    color: sat === 'LITER' ? '#1d4ed8' : sat === 'KG' ? '#92400e' : '#374151',
                                                    letterSpacing: '0.05em', textTransform: 'uppercase'
                                                }}>
                                                    {sat === 'LITER' ? '💧 Satuan Target: LITER' : sat === 'KG' ? '⚖️ Satuan Target: KG' : '📦 Satuan Target: DUS'}
                                                </td>
                                            </tr>
                                        );
                                        // Rows dalam grup
                                        groupRows.forEach((r, i) => {
                                            const pct      = r._pct;
                                            const realDisp = r._real_konversi ?? Number(r.realisasi_qty || 0);
                                            // SISA mengikuti satuan target row (r.satuan)
                                            const sisaSatuan = r.satuan; // LITER atau KG atau DUS
                                            const targetDisplay = Number(r.target_qty);
                                            // Realisasi dalam satuan target untuk hitung sisa
                                            const realForSisa = sat === 'LITER'
                                                ? (r.liter_per_dus ? Number(r.realisasi_qty || 0) * Number(r.liter_per_dus) : Number(r.realisasi_qty || 0))
                                                : sat === 'KG'
                                                ? (r.kg_per_dus ? Number(r.realisasi_qty || 0) * Number(r.kg_per_dus) : Number(r.realisasi_qty || 0))
                                                : Number(r.realisasi_qty || 0);
                                            const sisa = targetDisplay - realForSisa;
                                            const st   = getStatusStyle(pct);
                                            rows_with_headers.push(
                                                <tr key={`r-${sat}-${i}`} style={{ borderTop: '1px solid #f3f4f6', background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                                                    <td style={{ ...TD, fontWeight: 600, color: '#374151' }}>{r.product_name}</td>
                                                    <td style={{ ...TD, textAlign: 'center', color: '#6b7280' }}>
                                                        <span style={{ fontSize: '0.65rem', fontWeight: 700, padding: '1px 6px', borderRadius: 99, background: sat === 'LITER' ? '#dbeafe' : sat === 'KG' ? '#fef3c7' : '#f3f4f6', color: sat === 'LITER' ? '#1d4ed8' : sat === 'KG' ? '#92400e' : '#6b7280' }}>{sat}</span>
                                                    </td>
                                                    <td style={{ ...TD, textAlign: 'right', fontWeight: 600 }}>
                                                        {fmt(targetDisplay)} <span style={{ fontSize: '0.65rem', color: '#9ca3af' }}>{sat}</span>
                                                    </td>
                                                    <td style={{ ...TD, textAlign: 'right', color: (pct ?? 0) > 0 ? '#15803d' : '#374151', fontWeight: (pct ?? 0) > 0 ? 600 : 400 }}>
                                                        {fmt(realDisp)}
                                                        {r._satuan_real !== 'DUS' && r._real_konversi != null && <span style={{ fontSize: '0.65rem', color: '#9ca3af', marginLeft: 2 }}>{r._satuan_real}</span>}
                                                    </td>
                                                    <td style={{ ...TD, textAlign: 'right', color: sisa > 0 ? '#dc2626' : '#15803d', fontWeight: 600 }}>
                                                        {targetDisplay > 0 ? (sisa > 0
                                                            ? <>{fmt(sisa)}<span style={{ fontSize: '0.65rem', color: '#9ca3af', marginLeft: 2 }}>{sisaSatuan}</span></>
                                                            : '✓') : '–'}
                                                    </td>
                                                    <td style={{ ...TD, textAlign: 'right' }}>{fmtRp(r.realisasi_rupiah || 0)}</td>
                                                    <td style={{ ...TD }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                            {pct !== null && <ProgressBar pct={pct} />}
                                                            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: st.color, minWidth: 40, textAlign: 'right' }}>{pct !== null ? pct.toFixed(1) + '%' : '–'}</span>
                                                        </div>
                                                    </td>
                                                    <td style={{ ...TD, textAlign: 'center' }}>
                                                        <span style={{ fontSize: '0.68rem', fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: st.bg, color: st.color }}>{st.icon} {st.label}</span>
                                                    </td>
                                                </tr>
                                            );
                                        });
                                    });
                                    return rows_with_headers;
                                }

                                // Normal render (1 satuan saja)
                                return sortedRows.map((r, i) => {
                                    const pct      = r._pct;
                                    const realDisp = r._real_konversi ?? Number(r.realisasi_qty || 0);
                                    const sisaDUS  = Number(r.target_qty) - Number(r.realisasi_qty || 0);
                                    const hasKonv  = satuan !== 'DUS' && r._real_konversi != null;
                                    const st = getStatusStyle(pct);
                                    return (
                                        <tr key={i} style={{ borderTop: '1px solid #f3f4f6', background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                                            <td style={{ ...TD, fontWeight: 600, color: '#374151' }}>{r.product_name}</td>
                                            <td style={{ ...TD, textAlign: 'center', color: '#6b7280' }}>{r.satuan}</td>
                                            <td style={{ ...TD, textAlign: 'right', fontWeight: 600 }}>
                                                {fmt(r.target_qty)}
                                                <span style={{ fontSize: '0.68rem', color: '#9ca3af', marginLeft: 3 }}>{r.satuan}</span>
                                            </td>
                                            <td style={{ ...TD, textAlign: 'right', color: (pct ?? 0) > 0 ? '#15803d' : '#374151', fontWeight: (pct ?? 0) > 0 ? 600 : 400 }}>
                                                {fmt(realDisp)}
                                                {hasKonv && <span style={{ fontSize: '0.68rem', color: '#9ca3af', marginLeft: 3 }}>{r._satuan_real}</span>}
                                                {satuan !== 'DUS' && r._real_konversi == null && <span style={{ fontSize: '0.68rem', color: '#f59e0b', marginLeft: 3 }}>(DUS)</span>}
                                            </td>
                                            <td style={{ ...TD, textAlign: 'right', color: sisaDUS > 0 ? '#dc2626' : '#15803d', fontWeight: 600 }}>
                                                {r.target_qty > 0 ? (sisaDUS > 0 ? <>{fmt(sisaDUS)}<span style={{ fontSize: '0.68rem', color: '#9ca3af', marginLeft: 3 }}>DUS</span></> : '✓') : '–'}
                                            </td>
                                            <td style={{ ...TD, textAlign: 'right' }}>{fmtRp(r.realisasi_rupiah || 0)}</td>
                                            <td style={{ ...TD }}>
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
                                });
                            })()}
                        </tbody>
                        <tfoot>
                            <tr style={{ background: '#f1f5f9', borderTop: '2px solid #e2e8f0' }}>
                                <td style={{ ...TD, fontWeight: 700, color: '#1e293b' }} colSpan={2}>TOTAL</td>
                                <td style={{ ...TD, textAlign: 'right', fontWeight: 700 }}>
                                    {fmt(totalTarget)} <span style={{fontSize:'0.68rem',color:'#9ca3af'}}>DUS</span>
                                </td>
                                <td style={{ ...TD, textAlign: 'right', fontWeight: 700, color: '#15803d' }}>
                                    {fmt(totalRealDisplay)}
                                    {satuan !== 'DUS' && <span style={{fontSize:'0.68rem',color:'#9ca3af',marginLeft:3}}>{satuan}</span>}
                                </td>
                                <td style={{ ...TD, textAlign: 'right', fontWeight: 700, color: (totalTarget - totalRealDUS) > 0 ? '#dc2626' : '#15803d' }}>
                                    {(totalTarget - totalRealDUS) > 0
                                        ? <>{fmt(totalTarget - totalRealDUS)}<span style={{fontSize:'0.68rem',color:'#9ca3af',marginLeft:3}}>DUS</span></>
                                        : '✓ TERCAPAI'}
                                </td>
                                <td style={{ ...TD, textAlign: 'right', fontWeight: 700 }}>{fmtRp(totalRp)}</td>
                                <td style={{ ...TD, textAlign: 'center' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                        {overallPct !== null && <ProgressBar pct={overallPct} />}
                                        <span style={{ fontSize: '0.8rem', fontWeight: 800, color: status.color, minWidth: 40, textAlign: 'right' }}>
                                            {overallPct !== null ? overallPct.toFixed(1) + '%' : '–'}
                                        </span>
                                        {satuan !== 'DUS' && <span style={{fontSize:'0.65rem',color:'#9ca3af',marginLeft:2,whiteSpace:'nowrap'}}>(vs DUS)</span>}
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

const AREAS = ['Semua', 'NON TARGET'];
const AREA_LABELS = { 'NON TARGET': 'Non Target' };


function ProdukBlock({ product, customers, totalTargetDUS, totalRealisasiDUS, totalRupiah, overallPct, st, expandAll }) {
    const [open, setOpen] = useState(true);
    useEffect(() => {
        if (expandAll === true)  setOpen(true);
        if (expandAll === false) setOpen(false);
    }, [expandAll]);

    return (
        <div style={{ background: '#fff', borderRadius: 12, overflow: 'hidden', border: '1px solid #e5e7eb', boxShadow: '0 1px 4px rgba(0,0,0,0.05)', marginBottom: 12 }}>
            {/* Header accordion */}
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
                        <div style={{ fontSize: '0.72rem', color: '#9ca3af' }}>
                            {customers.length} customer · target {fmt(totalTargetDUS)} DUS
                        </div>
                    </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexShrink: 0 }}>
                    <div style={{ textAlign: 'right', minWidth: 140 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'flex-end', marginBottom: 4 }}>
                            <span style={{ fontSize: '0.68rem', fontWeight: 700, padding: '1px 6px', borderRadius: 99, background: st.bg, color: st.color }}>{st.label}</span>
                            <span style={{ fontSize: '0.9rem', fontWeight: 700, color: st.color }}>
                                {overallPct !== null ? overallPct.toFixed(1) + '%' : '0%'}
                            </span>
                        </div>
                        <ProgressBar pct={overallPct ?? 0} />
                        <div style={{ fontSize: '0.68rem', color: '#9ca3af', marginTop: 4 }}>
                            {fmt(totalRealisasiDUS)} / {fmt(totalTargetDUS)} DUS
                        </div>
                    </div>
                    <div style={{ textAlign: 'right', minWidth: 100 }}>
                        <div style={{ fontSize: '0.68rem', color: '#9ca3af' }}>Realisasi</div>
                        <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#374151' }}>{fmtRp(totalRupiah)}</div>
                    </div>
                    <div style={{ color: '#9ca3af' }}>{open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}</div>
                </div>
            </button>

            {/* Tabel customers */}
            {open && (
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                        <thead>
                            <tr style={{ background: '#f8fafc' }}>
                                <th style={TH}>CUSTOMER</th>
                                <th style={TH}>AREA</th>
                                <th style={{ ...TH, textAlign: 'right' }}>TARGET (DUS)</th>
                                <th style={{ ...TH, textAlign: 'right' }}>REALISASI (DUS)</th>
                                <th style={{ ...TH, textAlign: 'right' }}>SISA (DUS)</th>
                                <th style={{ ...TH, textAlign: 'right' }}>NILAI (Rp)</th>
                                <th style={{ ...TH, textAlign: 'center', minWidth: 140 }}>PENCAPAIAN</th>
                                <th style={{ ...TH, textAlign: 'center' }}>STATUS</th>
                            </tr>
                        </thead>
                        <tbody>
                            {customers.map((c, i) => {
                                const pct = c.target > 0 ? (c.realisasi / c.target) * 100 : null;
                                const sisa = c.target - c.realisasi;
                                const cst  = getStatusStyle(pct, c.area === 'NON TARGET');
                                return (
                                    <tr key={i} style={{ borderTop: '1px solid #f3f4f6', background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                                        <td style={{ ...TD, fontWeight: 600, color: '#374151' }}>{c.customer}</td>
                                        <td style={{ ...TD, color: '#6b7280', fontSize: '0.78rem' }}>{c.area || '–'}</td>
                                        <td style={{ ...TD, textAlign: 'right', fontWeight: 600 }}>{c.target > 0 ? fmt(c.target) : '–'}</td>
                                        <td style={{ ...TD, textAlign: 'right', color: (pct ?? 0) > 0 ? '#15803d' : '#374151', fontWeight: (pct ?? 0) > 0 ? 600 : 400 }}>
                                            {fmt(c.realisasi)}
                                        </td>
                                        <td style={{ ...TD, textAlign: 'right', color: sisa > 0 ? '#dc2626' : '#15803d', fontWeight: 600 }}>
                                            {c.target > 0 ? (sisa > 0 ? fmt(sisa) : '✓') : '–'}
                                        </td>
                                        <td style={{ ...TD, textAlign: 'right' }}>{fmtRp(c.rupiah)}</td>
                                        <td style={{ ...TD }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                {pct !== null && <ProgressBar pct={pct} />}
                                                <span style={{ fontSize: '0.78rem', fontWeight: 700, color: cst.color, minWidth: 40, textAlign: 'right' }}>
                                                    {pct !== null ? pct.toFixed(1) + '%' : '–'}
                                                </span>
                                            </div>
                                        </td>
                                        <td style={{ ...TD, textAlign: 'center' }}>
                                            <span style={{ fontSize: '0.68rem', fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: cst.bg, color: cst.color }}>
                                                {cst.icon} {cst.label}
                                            </span>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                        <tfoot>
                            <tr style={{ background: '#f1f5f9', borderTop: '2px solid #e2e8f0' }}>
                                <td style={{ ...TD, fontWeight: 700, color: '#1e293b' }} colSpan={2}>TOTAL</td>
                                <td style={{ ...TD, textAlign: 'right', fontWeight: 700 }}>{fmt(totalTargetDUS)}</td>
                                <td style={{ ...TD, textAlign: 'right', fontWeight: 700, color: '#15803d' }}>{fmt(totalRealisasiDUS)}</td>
                                <td style={{ ...TD, textAlign: 'right', fontWeight: 700, color: (totalTargetDUS - totalRealisasiDUS) > 0 ? '#dc2626' : '#15803d' }}>
                                    {(totalTargetDUS - totalRealisasiDUS) > 0 ? fmt(totalTargetDUS - totalRealisasiDUS) : '✓ TERCAPAI'}
                                </td>
                                <td style={{ ...TD, textAlign: 'right', fontWeight: 700 }}>{fmtRp(totalRupiah)}</td>
                                <td style={{ ...TD }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                        {overallPct !== null && <ProgressBar pct={overallPct} />}
                                        <span style={{ fontSize: '0.8rem', fontWeight: 800, color: st.color, minWidth: 40, textAlign: 'right' }}>
                                            {overallPct !== null ? overallPct.toFixed(1) + '%' : '–'}
                                        </span>
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
    const [sortRekap, setSortRekap]     = useState('pct');   // 'pct' | 'nilai'
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
        const result = grouped.filter(g => {
            if (filterArea !== 'Semua' && g.area !== filterArea) return false;
            if (filterStatus !== 'Semua') {
                const t = g.rows.reduce((s, r) => s + Number(r.target_qty), 0);
                const r = g.rows.reduce((s, r2) => s + Number(r2.realisasi_qty || 0), 0);
                const pct = t > 0 ? (r / t) * 100 : 0;
                if (filterStatus === 'Tercapai'      && pct < 100) return false;
                if (filterStatus === 'Belum Tercapai'&& pct >= 100) return false;
                if (filterStatus === '>80%'        && pct < 80)  return false;
                if (filterStatus === '<50%'        && pct >= 50) return false;
            }
            return true;
        });
        // Sortir: NON TARGET ke bawah, lalu nilai realisasi (rupiah) terbanyak dulu
        return result.sort((a, b) => {
            if (a.area === 'NON TARGET' && b.area !== 'NON TARGET') return 1;
            if (a.area !== 'NON TARGET' && b.area === 'NON TARGET') return -1;
            const rpA = a.rows.reduce((s, r) => s + Number(r.realisasi_rupiah || 0), 0);
            const rpB = b.rows.reduce((s, r) => s + Number(r.realisasi_rupiah || 0), 0);
            return rpB - rpA; // nilai terbanyak dulu
        });
    }, [grouped, filterArea, filterStatus]);

    const stats = useMemo(() => {
        // Target selalu DUS
        const totalTarget = data.reduce((s, r) => s + Number(r.target_qty), 0);
        // Realisasi DUS
        const totalRealDUS = data.reduce((s, r) => s + Number(r.realisasi_qty || 0), 0);
        const totalReal = totalRealDUS;
        const totalRp     = data.reduce((s, r) => s + Number(r.realisasi_rupiah || 0), 0);
        // % selalu DUS vs DUS
        const overallPct  = totalTarget > 0 ? (totalRealDUS / totalTarget) * 100 : 0;
        const tercapai    = grouped.filter(g => {
            const t = g.rows.reduce((s, r) => s + Number(r.target_qty), 0);
            const r = g.rows.reduce((s, r2) => s + Number(r2.realisasi_qty || 0), 0);
            return t > 0 && r / t >= 1;
        }).length;
        return { totalTarget, totalReal, totalRp, overallPct, tercapai };
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

    // rekapProduk dengan konversi satuan
    const rekapProdukConv = useMemo(() => {
        const mapped = rekapProduk.map(p => ({
            ...p,
            targetConv:    p.target,
            realisasiConv: p.realisasi,
            satuanReal:    'DUS',
            hasKonv:       false,
        }));
        if (sortRekap === 'nilai') {
            return mapped.sort((a, b) => b.rupiah - a.rupiah);
        }
        // default: sort by %
        return mapped.sort((a, b) => {
            const pA = a.target > 0 ? (a.realisasi / a.target) * 100 : 0;
            const pB = b.target > 0 ? (b.realisasi / b.target) * 100 : 0;
            return pB - pA;
        });
    }, [rekapProduk, sortRekap]);

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
        <div className="animate-fade-in">

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



            {/* Summary Cards */}
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 24 }}>
                <SummaryCard label="Total Target"     value={`${fmt(stats.totalTarget)} DUS`} sub={`${data.filter(r => r.target_qty > 0).length} item target`} color="#3b82f6" icon="🎯" />
                <SummaryCard label="Realisasi"        value={`${fmt(stats.totalReal)} DUS`}   sub={`${stats.overallPct.toFixed(1)}% dari total target`}       color="#22c55e" icon="📦" />
                <SummaryCard label="Nilai Penjualan"  value={fmtRp(stats.totalRp)}             sub="Dari invoice terkonfirmasi"                                color="#f59e0b" icon="💰" />
                <SummaryCard label="Customer Tercapai"   value={`${stats.tercapai} / ${grouped.length}`} sub="Sudah ≥100% pencapaian"                               color="#8b5cf6" icon="🏆" />
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

            {/* Tab Navigation */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
                {[['customer','👥 Per Customer'],['produk','📦 Per Produk']].map(([key, label]) => (
                    <button key={key} onClick={() => setActiveTab(key)} style={{
                        padding: '10px 24px', borderRadius: 10, fontSize: '0.88rem', fontWeight: 700,
                        border: '2px solid', cursor: 'pointer', transition: 'all 0.15s',
                        borderColor: activeTab === key ? '#3b82f6' : '#e5e7eb',
                        background: activeTab === key
                            ? 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)'
                            : '#fff',
                        color: activeTab === key ? '#fff' : '#6b7280',
                        boxShadow: activeTab === key ? '0 4px 12px rgba(59,130,246,0.35)' : 'none',
                    }}>{label}</button>
                ))}
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
                    {['Semua', 'Tercapai', '>80%', 'Belum Tercapai', '<50%'].map(s => (
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
                        const totalTarget    = p.customers.reduce((s, c) => s + c.target, 0);
                        const totalRealisasi = p.customers.reduce((s, c) => s + c.realisasi, 0);
                        const totalRupiah    = p.customers.reduce((s, c) => s + c.rupiah, 0);
                        const overallPct     = totalTarget > 0 ? (totalRealisasi / totalTarget) * 100 : null;
                        const st             = getStatusStyle(overallPct, false);
                        return (
                            <ProdukBlock key={p.product} product={p.product}
                                customers={p.customers}
                                totalTargetDUS={totalTarget}
                                totalRealisasiDUS={totalRealisasi}
                                totalRupiah={totalRupiah}
                                overallPct={overallPct} st={st} expandAll={expandAll} />
                        );
                    })}
                </div>
            )}
            {/* Rekap per Produk */}
            {!loading && rekapProduk.length > 0 && (
                <div style={{ background: '#fff', borderRadius: 12, marginTop: 28, border: '1px solid #e5e7eb', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                    <div style={{ padding: '12px 20px', borderBottom: '1px solid #e5e7eb', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <TrendingUp size={16} style={{ color: '#3b82f6' }} />
                        <h3 style={{ fontWeight: 700, fontSize: '0.9rem', color: '#111827' }}>Rekap per Produk — Semua Customer</h3>
                        </div>
                        <div style={{ display: 'flex', gap: 4, background: '#e5e7eb', padding: 3, borderRadius: 8 }}>
                            {[['pct','% Pencapaian'],['nilai','Nilai (Rp)']].map(([key, label]) => (
                                <button key={key} onClick={() => setSortRekap(key)} style={{
                                    padding: '4px 12px', borderRadius: 6, fontSize: '0.75rem', fontWeight: 600,
                                    border: 'none', cursor: 'pointer', transition: 'all 0.15s',
                                    background: sortRekap === key ? '#fff' : 'transparent',
                                    color: sortRekap === key ? '#1d4ed8' : '#6b7280',
                                    boxShadow: sortRekap === key ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                                }}>{label}</button>
                            ))}
                        </div>
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
                                {rekapProdukConv.map((p, i) => {
                                    // % selalu DUS vs DUS
                                    const pct  = p.target > 0 ? (p.realisasi / p.target) * 100 : 0;
                                    const sisa = p.target - p.realisasi; // sisa dalam DUS
                                    const st   = getStatusStyle(pct);
                                    return (
                                        <tr key={i} style={{ borderTop: '1px solid #f3f4f6', background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                                            <td style={{ ...TD, fontWeight: 700, color: '#374151' }}>{p.product}</td>
                                            <td style={{ ...TD, textAlign: 'right' }}>
                                                {fmt(p.target)} <span style={{fontSize:'0.68rem',color:'#9ca3af'}}>DUS</span>
                                            </td>
                                            <td style={{ ...TD, textAlign: 'right', color: pct > 0 ? '#15803d' : '#374151', fontWeight: 600 }}>
                                                {fmt(p.realisasiConv)}
                                                {p.hasKonv && <span style={{fontSize:'0.68rem',color:'#9ca3af',marginLeft:3}}>{p.satuanReal}</span>}
                                            </td>
                                            <td style={{ ...TD, textAlign: 'right', color: sisa > 0 ? '#dc2626' : '#15803d', fontWeight: 600 }}>
                                                {sisa > 0 ? <>{fmt(sisa)}<span style={{fontSize:'0.68rem',color:'#9ca3af',marginLeft:3}}>DUS</span></> : '✓'}
                                            </td>                                            <td style={{ ...TD, textAlign: 'right' }}>{fmtRp(p.rupiah)}</td>
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
                    { s: getStatusStyle(100), l: '≥ 100% Tercapai' },
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