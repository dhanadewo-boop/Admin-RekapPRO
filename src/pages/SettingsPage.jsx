import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import {
    Target, Building2, Map, Users, ShieldCheck,
    Save, CheckCircle, AlertCircle, Loader2, ChevronRight,
    Pencil, X, Plus, Mail, Eye, EyeOff, MapPin, UserCircle,
    Phone, Globe
} from 'lucide-react';

// ─── Constants ────────────────────────────────────────────────────────────────
const TABS = [
    { id: 'target-penjualan',  label: 'Target Penjualan',  icon: Target,      done: true  },
    { id: 'profil-perusahaan', label: 'Profil Perusahaan', icon: Building2,   done: true  },
    { id: 'area-kota',         label: 'Area & Kota',       icon: Map,         done: true  },
    { id: 'target-customer',   label: 'Target Customer',   icon: Users,       done: true  },
    { id: 'auth-user',         label: 'Auth & User',       icon: ShieldCheck, done: true  },
];

const AREAS = ['Area 1', 'Area 2', 'Area 3', 'Area 4', 'Area 5', 'NON TARGET'];

const ROLE_META = {
    admin:     { label: 'Administrator', color: 'var(--accent-blue)',    bg: 'rgba(72,169,166,0.12)'  },
    pimpinan:  { label: 'Pimpinan',      color: 'var(--accent-purple)',  bg: 'rgba(91,158,166,0.12)'  },
    marketing: { label: 'Marketing',     color: 'var(--accent-emerald)', bg: 'rgba(46,204,113,0.12)'  },
};

const AREA_COLORS = {
    'Area 1': '#48A9A6', 'Area 2': '#5B9EA6', 'Area 3': '#2ECC71',
    'Area 4': '#F2994A', 'Area 5': '#9B59B6', 'NON TARGET': '#95a5a6',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmtRp    = (n) => n ? `Rp ${Number(n).toLocaleString('id-ID')}` : 'Rp 0';
const parseRp  = (s) => Number(String(s).replace(/[^0-9]/g, '')) || 0;
const fmtInput = (v) => { const n = String(v).replace(/[^0-9]/g, ''); return n ? Number(n).toLocaleString('id-ID') : ''; };
const fmtDate  = (d) => d ? new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

function useToast() {
    const [toast, setToast] = useState(null);
    const show = (type, msg) => { setToast({ type, msg }); setTimeout(() => setToast(null), 3500); };
    return [toast, show];
}

// ─── Shared UI Primitives ─────────────────────────────────────────────────────
const iStyle = {
    padding: '11px 14px', borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--border-glass)', fontSize: '1rem',
    color: 'var(--text-primary)', outline: 'none', background: 'white',
    width: '100%', transition: 'border-color 0.15s',
};
const focusBlue = { onFocus: e => e.target.style.borderColor = 'var(--accent-blue)', onBlur: e => e.target.style.borderColor = 'var(--border-glass)' };

function Toast({ toast }) {
    if (!toast) return null;
    const ok = toast.type === 'success';
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 18px', borderRadius: 'var(--radius-sm)', marginBottom: 24, background: ok ? 'rgba(46,204,113,0.12)' : 'rgba(231,76,60,0.10)', border: `1px solid ${ok ? 'rgba(46,204,113,0.3)' : 'rgba(231,76,60,0.3)'}`, color: ok ? '#1a7a45' : '#c0392b', fontSize: '0.95rem', fontWeight: 500 }}>
            {ok ? <CheckCircle size={16} /> : <AlertCircle size={16} />}{toast.msg}
        </div>
    );
}

function SecTitle({ icon: Icon, title, desc }) {
    return (
        <div style={{ marginBottom: 28 }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 10 }}>
                <Icon size={22} color="var(--accent-blue)" />{title}
            </h2>
            {desc && <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', lineHeight: 1.7 }}>{desc}</p>}
        </div>
    );
}

function Field({ label, children }) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            <label style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</label>
            {children}
        </div>
    );
}

function BtnPrimary({ onClick, loading, disabled, icon, label }) {
    const off = disabled || loading;
    return (
        <button onClick={onClick} disabled={off} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 20px', borderRadius: 'var(--radius-sm)', background: off ? 'var(--bg-glass)' : 'var(--gradient-primary)', color: off ? 'var(--text-muted)' : 'white', fontSize: '0.95rem', fontWeight: 600, cursor: off ? 'not-allowed' : 'pointer', opacity: loading ? 0.75 : 1, flexShrink: 0 }}>
            {loading ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : icon}{label}
        </button>
    );
}

function BtnGhost({ onClick, icon, label, title }) {
    return (
        <button onClick={onClick} title={title} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 16px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-glass)', background: 'white', color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: 500, cursor: 'pointer', flexShrink: 0 }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-glass-hover)'}
            onMouseLeave={e => e.currentTarget.style.background = 'white'}>
            {icon}{label}
        </button>
    );
}

function BtnDanger({ onClick, loading, icon, title }) {
    return (
        <button onClick={onClick} title={title} disabled={loading} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '10px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(231,76,60,0.25)', background: 'white', color: 'var(--accent-rose)', cursor: loading ? 'not-allowed' : 'pointer', flexShrink: 0 }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(231,76,60,0.06)'}
            onMouseLeave={e => e.currentTarget.style.background = 'white'}>
            {loading ? <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> : icon}
        </button>
    );
}

function TblHead({ cols }) {
    return (
        <div style={{ display: 'grid', gridTemplateColumns: cols, padding: '13px 22px', background: 'var(--bg-glass)', borderBottom: '1px solid var(--border-glass)', fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            {arguments[0].labels.map((l, i) => <span key={i} style={i === arguments[0].labels.length - 1 ? { textAlign: 'right' } : {}}>{l}</span>)}
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAB 1 — Target Penjualan
// ═══════════════════════════════════════════════════════════════════════════════
function TabTargetPenjualan() {
    const [rows, setRows]         = useState([]);
    const [editing, setEditing]   = useState(null);
    const [editVal, setEditVal]   = useState('');
    const [newYear, setNewYear]   = useState('');
    const [newAmt, setNewAmt]     = useState('');
    const [loading, setLoading]   = useState(true);
    const [saving, setSaving]     = useState(false);
    const [toast, showToast]      = useToast();

    useEffect(() => { load(); }, []);

    const load = async () => {
        setLoading(true);
        const { data, error } = await supabase.from('app_settings').select('key,value,updated_at').like('key', 'target_penjualan_%').order('key', { ascending: false });
        if (error) { showToast('error', 'Gagal memuat: ' + error.message); setLoading(false); return; }
        setRows((data || []).map(r => ({ year: parseInt(r.key.replace('target_penjualan_', '')), amount: r.value?.amount ?? 0, updated_at: r.updated_at })).sort((a, b) => b.year - a.year));
        setLoading(false);
    };

    const upsert = async (year, rawVal) => {
        const amount = parseRp(rawVal);
        if (!amount) { showToast('error', 'Nominal harus lebih dari 0'); return; }
        setSaving(true);
        const { error } = await supabase.from('app_settings').upsert({ key: `target_penjualan_${year}`, value: { amount }, updated_at: new Date().toISOString() }, { onConflict: 'key' });
        setSaving(false);
        if (error) { showToast('error', 'Gagal: ' + error.message); return; }
        showToast('success', `Target ${year} disimpan`);
        setEditing(null); load();
    };

    const addNew = async () => {
        const yr = parseInt(newYear);
        if (!yr || yr < 2020 || yr > 2100) { showToast('error', 'Tahun tidak valid'); return; }
        if (rows.find(r => r.year === yr)) { showToast('error', `Tahun ${yr} sudah ada`); return; }
        await upsert(yr, newAmt);
        setNewYear(''); setNewAmt('');
    };

    const COLS = '90px 1fr 160px 130px';
    return (
        <div>
            <SecTitle icon={Target} title="Target Penjualan" desc="Target omzet tahunan yang digunakan Dashboard dan Program Target untuk menghitung persentase pencapaian." />
            <Toast toast={toast} />

            <div style={{ background: 'white', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-glass)', boxShadow: 'var(--shadow-sm)', overflow: 'hidden', marginBottom: 20 }}>
                <div style={{ display: 'grid', gridTemplateColumns: COLS, padding: '13px 22px', background: 'var(--bg-glass)', borderBottom: '1px solid var(--border-glass)', fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    <span>Tahun</span><span>Target Omzet</span><span>Diperbarui</span><span style={{ textAlign: 'right' }}>Aksi</span>
                </div>
                {loading ? (
                    <div style={{ padding: 40, textAlign: 'center' }}><Loader2 size={22} style={{ animation: 'spin 1s linear infinite', color: 'var(--accent-blue)' }} /></div>
                ) : rows.length === 0 ? (
                    <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.875rem' }}>Belum ada target. Tambahkan di bawah.</div>
                ) : rows.map((row, i) => (
                    <div key={row.year} style={{ display: 'grid', gridTemplateColumns: COLS, padding: '18px 22px', alignItems: 'center', borderBottom: i < rows.length - 1 ? '1px solid var(--border-glass)' : 'none', background: editing === row.year ? 'rgba(72,169,166,0.04)' : 'white' }}>
                        <span style={{ fontWeight: 700, color: 'var(--accent-blue)' }}>{row.year}</span>
                        {editing === row.year
                            ? <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Rp</span><input autoFocus value={editVal} onChange={e => setEditVal(fmtInput(e.target.value))} onKeyDown={e => { if (e.key === 'Enter') upsert(row.year, editVal); if (e.key === 'Escape') setEditing(null); }} style={{ ...iStyle, maxWidth: 260, borderColor: 'var(--accent-blue)' }} /></div>
                            : <span style={{ fontWeight: 600 }}>{fmtRp(row.amount)}</span>}
                        <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>{fmtDate(row.updated_at)}</span>
                        <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                            {editing === row.year
                                ? <><BtnPrimary onClick={() => upsert(row.year, editVal)} loading={saving} icon={<Save size={13} />} label="Simpan" /><BtnGhost onClick={() => setEditing(null)} label="Batal" /></>
                                : <BtnGhost onClick={() => { setEditing(row.year); setEditVal(fmtInput(row.amount)); }} icon={<Pencil size={13} />} label="Edit" />}
                        </div>
                    </div>
                ))}
            </div>

            <div style={{ background: 'white', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-glass)', boxShadow: 'var(--shadow-sm)', padding: 20 }}>
                <p style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 16 }}>+ Tambah Tahun Baru</p>
                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
                    <Field label="Tahun"><input type="number" value={newYear} onChange={e => setNewYear(e.target.value)} placeholder="2027" style={{ ...iStyle, width: 100 }} {...focusBlue} /></Field>
                    <Field label="Target Omzet (Rp)"><input value={newAmt} onChange={e => setNewAmt(fmtInput(e.target.value))} onKeyDown={e => e.key === 'Enter' && addNew()} placeholder="95.000.000.000" style={{ ...iStyle, minWidth: 220 }} {...focusBlue} /></Field>
                    <BtnPrimary onClick={addNew} loading={saving} disabled={!newYear || !newAmt} icon={<Plus size={14} />} label="Tambah" />
                </div>
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAB 2 — Profil Perusahaan
// ═══════════════════════════════════════════════════════════════════════════════
function TabProfilPerusahaan() {
    const [form, setForm]       = useState({ nama: '', alamat: '', telepon: '', website: '', tahun_aktif: new Date().getFullYear() });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving]   = useState(false);
    const [toast, showToast]    = useToast();

    useEffect(() => { load(); }, []);

    const load = async () => {
        setLoading(true);
        const { data } = await supabase.from('app_settings').select('value').eq('key', 'profil_perusahaan').maybeSingle();
        if (data?.value) setForm(p => ({ ...p, ...data.value }));
        setLoading(false);
    };

    const save = async () => {
        if (!form.nama.trim()) { showToast('error', 'Nama perusahaan wajib diisi'); return; }
        setSaving(true);
        const { error } = await supabase.from('app_settings').upsert({ key: 'profil_perusahaan', value: { ...form, nama: form.nama.trim() }, updated_at: new Date().toISOString() }, { onConflict: 'key' });
        setSaving(false);
        error ? showToast('error', 'Gagal: ' + error.message) : showToast('success', 'Profil perusahaan disimpan');
    };

    const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

    if (loading) return <div style={{ padding: 40, textAlign: 'center' }}><Loader2 size={22} style={{ animation: 'spin 1s linear infinite', color: 'var(--accent-blue)' }} /></div>;

    return (
        <div>
            <SecTitle icon={Building2} title="Profil Perusahaan" desc="Data ini akan muncul di header laporan Export Excel dan PDF." />
            <Toast toast={toast} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                <Field label="Nama Perusahaan *"><input value={form.nama} onChange={e => set('nama', e.target.value)} placeholder="PT. Nama Perusahaan" style={iStyle} {...focusBlue} /></Field>
                <Field label="Alamat"><textarea value={form.alamat} onChange={e => set('alamat', e.target.value)} placeholder="Jl. Contoh No. 1, Kota" rows={2} style={{ ...iStyle, resize: 'vertical', lineHeight: 1.5, fontFamily: 'inherit' }} {...focusBlue} /></Field>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    <Field label="Telepon">
                        <div style={{ position: 'relative' }}>
                            <Phone size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                            <input value={form.telepon} onChange={e => set('telepon', e.target.value)} placeholder="0341-xxxxxx" style={{ ...iStyle, paddingLeft: 30 }} {...focusBlue} />
                        </div>
                    </Field>
                    <Field label="Website">
                        <div style={{ position: 'relative' }}>
                            <Globe size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                            <input value={form.website} onChange={e => set('website', e.target.value)} placeholder="www.perusahaan.com" style={{ ...iStyle, paddingLeft: 30 }} {...focusBlue} />
                        </div>
                    </Field>
                </div>
                <Field label="Tahun Aktif"><input type="number" value={form.tahun_aktif} onChange={e => set('tahun_aktif', parseInt(e.target.value))} min="2020" max="2100" style={{ ...iStyle, width: 120 }} {...focusBlue} /></Field>

                {/* Live preview */}
                {form.nama && (
                    <div style={{ padding: '14px 18px', borderRadius: 'var(--radius-sm)', background: 'var(--bg-glass)', border: '1px solid var(--border-glass)' }}>
                        <p style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Preview Header Laporan</p>
                        <p style={{ fontWeight: 700, fontSize: '0.95rem' }}>{form.nama}</p>
                        {form.alamat && <p style={{ fontSize: '0.92rem', color: 'var(--text-secondary)', marginTop: 2 }}>{form.alamat}</p>}
                        {(form.telepon || form.website) && <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginTop: 2 }}>{[form.telepon, form.website].filter(Boolean).join(' · ')}</p>}
                    </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <BtnPrimary onClick={save} loading={saving} icon={<Save size={15} />} label="Simpan Profil" />
                </div>
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAB 3 — Area & Kota
// ═══════════════════════════════════════════════════════════════════════════════
function TabAreaKota() {
    const [rows, setRows]       = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving]   = useState(null);
    const [editing, setEditing] = useState(null); // { id, area, kota }
    const [addForm, setAddForm] = useState({ customer_name: '', area: 'Area 1', kota: '' });
    const [showAdd, setShowAdd] = useState(false);
    const [filter, setFilter]   = useState('Semua');
    const [toast, showToast]    = useToast();

    useEffect(() => { load(); }, []);

    const load = async () => {
        setLoading(true);
        const { data, error } = await supabase.from('customer_area_map').select('*').order('area').order('customer_name');
        if (error) { showToast('error', 'Gagal memuat: ' + error.message); setLoading(false); return; }
        setRows(data || []);
        setLoading(false);
    };

    const saveEdit = async () => {
        if (!editing?.kota.trim()) { showToast('error', 'Kota wajib diisi'); return; }
        setSaving(editing.id);
        const { error } = await supabase.from('customer_area_map').update({ area: editing.area, kota: editing.kota.trim() }).eq('id', editing.id);
        setSaving(null);
        if (error) { showToast('error', 'Gagal: ' + error.message); return; }
        showToast('success', 'Mapping diperbarui'); setEditing(null); load();
    };

    const saveAdd = async () => {
        if (!addForm.customer_name.trim() || !addForm.kota.trim()) { showToast('error', 'Nama customer dan kota wajib diisi'); return; }
        setSaving('new');
        const { error } = await supabase.from('customer_area_map').insert({ customer_name: addForm.customer_name.trim(), area: addForm.area, kota: addForm.kota.trim() });
        setSaving(null);
        if (error) { showToast('error', error.message.includes('duplicate') ? 'Customer sudah terdaftar' : 'Gagal: ' + error.message); return; }
        showToast('success', 'Customer ditambahkan');
        setAddForm({ customer_name: '', area: 'Area 1', kota: '' }); setShowAdd(false); load();
    };

    const del = async (id, name) => {
        if (!confirm(`Hapus mapping "${name}"?`)) return;
        setSaving(id);
        const { error } = await supabase.from('customer_area_map').delete().eq('id', id);
        setSaving(null);
        error ? showToast('error', 'Gagal: ' + error.message) : (showToast('success', 'Dihapus'), load());
    };

    const areaC = (a) => AREA_COLORS[a] || '#64748b';
    const shown = filter === 'Semua' ? rows : rows.filter(r => r.area === filter);
    const COLS  = '1fr 130px 140px 100px';

    return (
        <div>
            <SecTitle icon={Map} title="Area & Kota" desc="Mapping customer ke wilayah dan kota. Digunakan oleh filter area di halaman Program Target." />
            <Toast toast={toast} />

            {/* Filter bar + Add button */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, gap: 12, flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {['Semua', ...AREAS].map(a => (
                        <button key={a} onClick={() => setFilter(a)} style={{ padding: '7px 14px', borderRadius: 'var(--radius-full)', fontSize: '0.92rem', fontWeight: 600, cursor: 'pointer', background: filter === a ? (a === 'Semua' ? 'var(--accent-blue)' : areaC(a)) : 'var(--bg-glass)', color: filter === a ? 'white' : 'var(--text-secondary)', border: `1px solid ${filter === a ? 'transparent' : 'var(--border-glass)'}`, transition: 'all 0.15s' }}>
                            {a}
                        </button>
                    ))}
                </div>
                <button onClick={() => setShowAdd(v => !v)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 'var(--radius-sm)', background: showAdd ? 'var(--bg-glass)' : 'var(--gradient-primary)', color: showAdd ? 'var(--text-secondary)' : 'white', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}>
                    {showAdd ? <X size={14} /> : <Plus size={14} />}{showAdd ? 'Tutup' : 'Tambah Customer'}
                </button>
            </div>

            {/* Add form */}
            {showAdd && (
                <div style={{ background: 'rgba(72,169,166,0.05)', border: '1px dashed var(--accent-blue)', borderRadius: 'var(--radius-md)', padding: '18px 20px', marginBottom: 16 }}>
                    <p style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--accent-blue)', marginBottom: 14 }}>+ Mapping Baru</p>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 140px 150px auto', gap: 12, alignItems: 'flex-end' }}>
                        <Field label="Nama Customer"><input value={addForm.customer_name} onChange={e => setAddForm(p => ({ ...p, customer_name: e.target.value }))} placeholder="PT. Nama Customer" style={iStyle} {...focusBlue} /></Field>
                        <Field label="Area"><select value={addForm.area} onChange={e => setAddForm(p => ({ ...p, area: e.target.value }))} style={{ ...iStyle, cursor: 'pointer' }}>{AREAS.map(a => <option key={a} value={a}>{a}</option>)}</select></Field>
                        <Field label="Kota"><input value={addForm.kota} onChange={e => setAddForm(p => ({ ...p, kota: e.target.value }))} onKeyDown={e => e.key === 'Enter' && saveAdd()} placeholder="Malang" style={iStyle} {...focusBlue} /></Field>
                        <BtnPrimary onClick={saveAdd} loading={saving === 'new'} icon={<Save size={14} />} label="Simpan" />
                    </div>
                </div>
            )}

            {/* Table */}
            <div style={{ background: 'white', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-glass)', boxShadow: 'var(--shadow-sm)', overflow: 'hidden' }}>
                <div style={{ display: 'grid', gridTemplateColumns: COLS, padding: '13px 22px', background: 'var(--bg-glass)', borderBottom: '1px solid var(--border-glass)', fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    <span>Customer</span><span>Area</span><span>Kota</span><span style={{ textAlign: 'right' }}>Aksi</span>
                </div>
                {loading ? (
                    <div style={{ padding: 40, textAlign: 'center' }}><Loader2 size={22} style={{ animation: 'spin 1s linear infinite', color: 'var(--accent-blue)' }} /></div>
                ) : shown.length === 0 ? (
                    <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.875rem' }}>{rows.length === 0 ? 'Belum ada data. Klik "+ Tambah Customer".' : `Tidak ada customer di ${filter}.`}</div>
                ) : shown.map((row, i) => {
                    const isEd = editing?.id === row.id;
                    return (
                        <div key={row.id} style={{ display: 'grid', gridTemplateColumns: COLS, padding: '16px 22px', alignItems: 'center', borderBottom: i < shown.length - 1 ? '1px solid var(--border-glass)' : 'none', background: isEd ? 'rgba(72,169,166,0.04)' : 'white', transition: 'background 0.15s' }}>
                            <span style={{ fontWeight: 500, fontSize: '0.875rem' }}>{row.customer_name}</span>
                            {isEd
                                ? <select value={editing.area} onChange={e => setEditing(p => ({ ...p, area: e.target.value }))} style={{ ...iStyle, padding: '6px 8px', borderColor: 'var(--accent-blue)' }}>{AREAS.map(a => <option key={a} value={a}>{a}</option>)}</select>
                                : <span style={{ display: 'inline-flex' }}><span style={{ padding: '3px 10px', borderRadius: 'var(--radius-full)', fontSize: '0.85rem', fontWeight: 700, background: areaC(row.area) + '18', color: areaC(row.area) }}>{row.area}</span></span>}
                            {isEd
                                ? <input autoFocus value={editing.kota} onChange={e => setEditing(p => ({ ...p, kota: e.target.value }))} onKeyDown={e => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') setEditing(null); }} style={{ ...iStyle, padding: '6px 8px', borderColor: 'var(--accent-blue)' }} />
                                : <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 5 }}><MapPin size={13} color="var(--text-muted)" />{row.kota}</span>}
                            <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                                {isEd
                                    ? <><BtnPrimary onClick={saveEdit} loading={saving === row.id} icon={<Save size={13} />} label="OK" /><BtnGhost onClick={() => setEditing(null)} label="✕" /></>
                                    : <><BtnGhost onClick={() => setEditing({ id: row.id, area: row.area, kota: row.kota })} icon={<Pencil size={13} />} title="Edit" /><BtnDanger onClick={() => del(row.id, row.customer_name)} loading={saving === row.id} icon={<X size={13} />} title="Hapus" /></>}
                            </div>
                        </div>
                    );
                })}
            </div>
            {rows.length > 0 && <p style={{ marginTop: 10, fontSize: '0.9rem', color: 'var(--text-muted)' }}>{rows.length} customer · {shown.length} ditampilkan</p>}
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAB 4 — Auth & User
// ═══════════════════════════════════════════════════════════════════════════════
function TabAuthUser() {
    const { user: me }          = useAuth();
    const [users, setUsers]     = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving]   = useState(null);
    const [editing, setEditing] = useState(null); // { id, role, name }
    const [showAdd, setShowAdd] = useState(false);
    const [addForm, setAddForm] = useState({ name: '', email: '', password: '', role: 'marketing' });
    const [showPwd, setShowPwd] = useState(false);
    const [resetSent, setResetSent] = useState({});
    const [toast, showToast]    = useToast();

    useEffect(() => { load(); }, []);

    const load = async () => {
        setLoading(true);
        const { data, error } = await supabase.from('users').select('*').order('role').order('name');
        if (error) { showToast('error', 'Gagal memuat user'); setLoading(false); return; }
        setUsers(data || []);
        setLoading(false);
    };

    const saveEdit = async () => {
        if (!editing?.name.trim()) { showToast('error', 'Nama wajib diisi'); return; }
        setSaving(editing.id);
        const { error } = await supabase.from('users').update({ role: editing.role, name: editing.name.trim() }).eq('id', editing.id);
        setSaving(null);
        if (error) { showToast('error', 'Gagal: ' + error.message); return; }
        showToast('success', 'User diperbarui'); setEditing(null); load();
    };

    const sendReset = async (email) => {
        setSaving('reset-' + email);
        const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin });
        setSaving(null);
        if (error) { showToast('error', 'Gagal kirim email: ' + error.message); return; }
        setResetSent(p => ({ ...p, [email]: true }));
        showToast('success', `Link reset dikirim ke ${email}`);
    };

    const addUser = async () => {
        if (!addForm.name.trim() || !addForm.email.trim() || !addForm.password) { showToast('error', 'Semua field wajib diisi'); return; }
        if (addForm.password.length < 6) { showToast('error', 'Password minimal 6 karakter'); return; }
        setSaving('add');
        const { data: authData, error: authErr } = await supabase.auth.signUp({ email: addForm.email.trim(), password: addForm.password });
        if (authErr) { setSaving(null); showToast('error', 'Gagal buat akun: ' + authErr.message); return; }
        const uid = authData.user?.id;
        if (uid) {
            const { error: pErr } = await supabase.from('users').insert({ id: uid, name: addForm.name.trim(), email: addForm.email.trim(), role: addForm.role });
            if (pErr) { setSaving(null); showToast('error', 'Akun dibuat, profil gagal: ' + pErr.message); return; }
        }
        setSaving(null);
        showToast('success', `User "${addForm.name}" ditambahkan`);
        setAddForm({ name: '', email: '', password: '', role: 'marketing' }); setShowAdd(false); load();
    };

    const rm = (role) => ROLE_META[role] || { label: role, color: '#64748b', bg: '#f1f5f9' };

    return (
        <div>
            <SecTitle icon={ShieldCheck} title="Auth & User" desc="Kelola akun pengguna dan hak akses role. Hanya Admin yang bisa mengubah role user lain." />
            <Toast toast={toast} />

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
                <button onClick={() => setShowAdd(v => !v)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 18px', borderRadius: 'var(--radius-sm)', background: showAdd ? 'var(--bg-glass)' : 'var(--gradient-primary)', color: showAdd ? 'var(--text-secondary)' : 'white', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer' }}>
                    {showAdd ? <X size={15} /> : <Plus size={15} />}{showAdd ? 'Tutup' : 'Tambah User'}
                </button>
            </div>

            {/* Add form */}
            {showAdd && (
                <div style={{ background: 'rgba(72,169,166,0.05)', border: '1px dashed var(--accent-blue)', borderRadius: 'var(--radius-md)', padding: 20, marginBottom: 20 }}>
                    <p style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--accent-blue)', marginBottom: 16 }}>Tambah User Baru</p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                            <Field label="Nama Lengkap"><input value={addForm.name} onChange={e => setAddForm(p => ({ ...p, name: e.target.value }))} placeholder="Nama User" style={iStyle} {...focusBlue} /></Field>
                            <Field label="Email"><input type="email" value={addForm.email} onChange={e => setAddForm(p => ({ ...p, email: e.target.value }))} placeholder="user@email.com" style={iStyle} {...focusBlue} /></Field>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 160px', gap: 14 }}>
                            <Field label="Password Awal">
                                <div style={{ position: 'relative' }}>
                                    <input type={showPwd ? 'text' : 'password'} value={addForm.password} onChange={e => setAddForm(p => ({ ...p, password: e.target.value }))} placeholder="Min. 6 karakter" style={{ ...iStyle, paddingRight: 36 }} {...focusBlue} />
                                    <button onClick={() => setShowPwd(v => !v)} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', cursor: 'pointer', background: 'none', border: 'none', display: 'flex' }}>
                                        {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                                    </button>
                                </div>
                            </Field>
                            <Field label="Role"><select value={addForm.role} onChange={e => setAddForm(p => ({ ...p, role: e.target.value }))} style={{ ...iStyle, cursor: 'pointer' }}><option value="marketing">Marketing</option><option value="pimpinan">Pimpinan</option><option value="admin">Admin</option></select></Field>
                        </div>
                        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', alignItems: 'center' }}>
                            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', flex: 1 }}>⚠️ Bagikan email + password ke user. Minta ganti password via tombol "Reset Pwd".</p>
                            <BtnGhost onClick={() => setShowAdd(false)} label="Batal" />
                            <BtnPrimary onClick={addUser} loading={saving === 'add'} icon={<Plus size={14} />} label="Buat Akun" />
                        </div>
                    </div>
                </div>
            )}

            {/* User cards */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {loading ? (
                    <div style={{ padding: 40, textAlign: 'center' }}><Loader2 size={22} style={{ animation: 'spin 1s linear infinite', color: 'var(--accent-blue)' }} /></div>
                ) : users.length === 0 ? (
                    <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.875rem' }}>Belum ada user.</div>
                ) : users.map(u => {
                    const meta   = rm(u.role);
                    const isMe   = u.id === me?.id;
                    const isEd   = editing?.id === u.id;
                    return (
                        <div key={u.id} style={{ background: 'white', borderRadius: 'var(--radius-md)', border: isEd ? '1.5px solid var(--accent-blue)' : '1px solid var(--border-glass)', padding: '20px 24px', boxShadow: 'var(--shadow-sm)', transition: 'border-color 0.15s' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                                {/* Avatar */}
                                <div style={{ width: 50, height: 50, borderRadius: '50%', background: meta.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                    <UserCircle size={24} color={meta.color} />
                                </div>
                                {/* Info */}
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    {isEd
                                        ? <input value={editing.name} onChange={e => setEditing(p => ({ ...p, name: e.target.value }))} style={{ ...iStyle, fontWeight: 600, padding: '6px 10px', width: '100%', maxWidth: 280 }} {...focusBlue} />
                                        : <p style={{ fontWeight: 600, fontSize: '0.9rem' }}>{u.name}{isMe && <span style={{ marginLeft: 6, fontSize: '0.92rem', color: 'var(--accent-blue)', fontWeight: 700 }}>(Anda)</span>}</p>}
                                    <p style={{ fontSize: '0.92rem', color: 'var(--text-muted)', marginTop: 2 }}>{u.email}</p>
                                </div>
                                {/* Role */}
                                {isEd
                                    ? <select value={editing.role} onChange={e => setEditing(p => ({ ...p, role: e.target.value }))} disabled={isMe} style={{ ...iStyle, width: 145, cursor: isMe ? 'not-allowed' : 'pointer', padding: '7px 10px', opacity: isMe ? 0.5 : 1 }}><option value="marketing">Marketing</option><option value="pimpinan">Pimpinan</option><option value="admin">Admin</option></select>
                                    : <span style={{ padding: '4px 12px', borderRadius: 'var(--radius-full)', fontSize: '0.85rem', fontWeight: 700, background: meta.bg, color: meta.color, whiteSpace: 'nowrap' }}>{meta.label}</span>}
                                {/* Actions */}
                                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                                    {isEd
                                        ? <><BtnPrimary onClick={saveEdit} loading={saving === u.id} icon={<Save size={13} />} label="Simpan" /><BtnGhost onClick={() => setEditing(null)} label="Batal" /></>
                                        : <>
                                            <BtnGhost onClick={() => setEditing({ id: u.id, role: u.role, name: u.name })} icon={<Pencil size={13} />} label="Edit" />
                                            <button onClick={() => sendReset(u.email)} disabled={!!saving || resetSent[u.email]} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '8px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-glass)', background: resetSent[u.email] ? 'rgba(46,204,113,0.1)' : 'white', color: resetSent[u.email] ? '#1a7a45' : 'var(--text-secondary)', fontSize: '0.92rem', fontWeight: 500, cursor: saving || resetSent[u.email] ? 'not-allowed' : 'pointer' }}>
                                                {saving === 'reset-' + u.email ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : resetSent[u.email] ? <CheckCircle size={13} /> : <Mail size={13} />}
                                                {resetSent[u.email] ? 'Terkirim' : 'Reset Pwd'}
                                            </button>
                                          </>}
                                </div>
                            </div>
                            {isEd && isMe && <p style={{ marginTop: 10, fontSize: '0.85rem', color: 'var(--accent-amber)', paddingLeft: 56 }}>⚠️ Anda tidak bisa mengubah role akun sendiri.</p>}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAB 5 — Target Customer
// ═══════════════════════════════════════════════════════════════════════════════
const PRODUK_SUGGESTIONS = [
    // Pupuk
    'OSMOCOTE', 'GANDAPAN', 'GANDASIL', 'MIKROFID ZN', 'DEKORGAN', 'GANDASTAR', 'MASTOFOL',
    // Pestisida
    'DEKAMON 1,2 G', 'DEKAMON 22.43', 'DIMACIDE', 'DEKAPIRIM', 'DEKTIN', 'MASALGIN', 'VELIMEK', 'DEKABOND',
];
const SATUAN_OPT = ['DUS', 'LITER', 'KG'];

function TabTargetCustomer() {
    const [tahun, setTahun]         = useState(new Date().getFullYear());
    const [rows, setRows]           = useState([]);   // flat rows from product_targets
    const [areaMap, setAreaMap]     = useState({});   // { customer_name: { area, kota } }
    const [loading, setLoading]     = useState(true);
    const [saving, setSaving]       = useState(null);
    const [editing, setEditing]     = useState(null); // { id, product_name, target_qty, satuan }
    const [toast, showToast]        = useToast();

    // Add-row state: { customer_name, product_name, target_qty, satuan }
    const [addRow, setAddRow]       = useState(null);
    // New customer form (first row)
    const [newCust, setNewCust]     = useState(null); // { customer_name, product_name, target_qty, satuan }
    const [showNewCust, setShowNewCust] = useState(false);

    const YEARS = [2025, 2026, 2027].includes(tahun) ? [2025, 2026, 2027] : [tahun - 1, tahun, tahun + 1];

    useEffect(() => { loadAll(); }, [tahun]);

    const loadAll = async () => {
        setLoading(true);
        const [ptRes, amRes] = await Promise.all([
            supabase.from('product_targets').select('*').eq('tahun', tahun).order('customer_name').order('product_name'),
            supabase.from('customer_area_map').select('customer_name, area, kota'),
        ]);
        if (ptRes.error) { showToast('error', 'Gagal memuat: ' + ptRes.error.message); setLoading(false); return; }
        setRows(ptRes.data || []);
        const am = {};
        (amRes.data || []).forEach(r => { am[r.customer_name] = { area: r.area, kota: r.kota }; });
        setAreaMap(am);
        setLoading(false);
    };

    // Group rows by customer_name
    const grouped = rows.reduce((acc, r) => {
        if (!acc[r.customer_name]) acc[r.customer_name] = [];
        acc[r.customer_name].push(r);
        return acc;
    }, {});
    const customers = Object.keys(grouped).sort();

    // ── Save edit ──
    const saveEdit = async () => {
        const qty = Number(String(editing.target_qty).replace(/[^0-9]/g, ''));
        if (!qty || qty <= 0) { showToast('error', 'Target harus lebih dari 0'); return; }
        if (!editing.product_name.trim()) { showToast('error', 'Nama produk wajib diisi'); return; }
        setSaving(editing.id);
        const { error } = await supabase.from('product_targets').update({
            product_name: editing.product_name.trim().toUpperCase(),
            target_qty: qty, satuan: editing.satuan,
        }).eq('id', editing.id);
        setSaving(null);
        if (error) { showToast('error', 'Gagal: ' + error.message); return; }
        showToast('success', 'Target diperbarui'); setEditing(null); loadAll();
    };

    // ── Add row to existing customer ──
    const saveAddRow = async () => {
        if (!addRow) return;
        const qty = Number(String(addRow.target_qty).replace(/[^0-9]/g, ''));
        if (!addRow.product_name.trim()) { showToast('error', 'Nama produk wajib diisi'); return; }
        if (!qty || qty <= 0) { showToast('error', 'Target harus lebih dari 0'); return; }
        // Check duplicate produk
        if (grouped[addRow.customer_name]?.find(r => r.product_name.toUpperCase() === addRow.product_name.trim().toUpperCase())) {
            showToast('error', `${addRow.product_name.toUpperCase()} sudah ada untuk customer ini`); return;
        }
        setSaving('add-' + addRow.customer_name);
        const { error } = await supabase.from('product_targets').insert({
            customer_name: addRow.customer_name,
            product_name: addRow.product_name.trim().toUpperCase(),
            target_qty: qty, satuan: addRow.satuan, tahun,
        });
        setSaving(null);
        if (error) { showToast('error', 'Gagal: ' + error.message); return; }
        showToast('success', 'Produk ditambahkan'); setAddRow(null); loadAll();
    };

    // ── Add new customer ──
    const saveNewCust = async () => {
        if (!newCust) return;
        const qty = Number(String(newCust.target_qty).replace(/[^0-9]/g, ''));
        if (!newCust.customer_name.trim()) { showToast('error', 'Nama customer wajib diisi'); return; }
        if (customers.includes(newCust.customer_name.trim())) { showToast('error', 'Customer sudah ada di daftar'); return; }
        if (!newCust.product_name.trim()) { showToast('error', 'Produk pertama wajib diisi'); return; }
        if (!qty || qty <= 0) { showToast('error', 'Target harus lebih dari 0'); return; }
        setSaving('new-cust');
        const { error } = await supabase.from('product_targets').insert({
            customer_name: newCust.customer_name.trim(),
            product_name: newCust.product_name.trim().toUpperCase(),
            target_qty: qty, satuan: newCust.satuan, tahun,
        });
        setSaving(null);
        if (error) { showToast('error', 'Gagal: ' + error.message); return; }
        showToast('success', `Customer "${newCust.customer_name}" ditambahkan`);
        setNewCust(null); setShowNewCust(false); loadAll();
    };

    // ── Delete row ──
    const del = async (id, label) => {
        if (!confirm(`Hapus target "${label}"?`)) return;
        setSaving(id);
        const { error } = await supabase.from('product_targets').delete().eq('id', id);
        setSaving(null);
        error ? showToast('error', 'Gagal: ' + error.message) : (showToast('success', 'Dihapus'), loadAll());
    };

    // ── Delete all targets for a customer this year ──
    const delCustomer = async (name) => {
        if (!confirm(`Hapus SEMUA target "${name}" tahun ${tahun}?`)) return;
        setSaving('del-' + name);
        const { error } = await supabase.from('product_targets').delete().eq('customer_name', name).eq('tahun', tahun);
        setSaving(null);
        error ? showToast('error', 'Gagal: ' + error.message) : (showToast('success', `Target ${name} dihapus`), loadAll());
    };

    // ── Copy from previous year ──
    const [copying, setCopying] = useState(false);
    const copyFromPrevYear = async () => {
        const srcYear = tahun - 1;

        // Fetch source year data
        const { data: srcRows, error: srcErr } = await supabase
            .from('product_targets').select('customer_name, product_name, target_qty, satuan')
            .eq('tahun', srcYear);
        if (srcErr) { showToast('error', 'Gagal ambil data ' + srcYear + ': ' + srcErr.message); return; }
        if (!srcRows || srcRows.length === 0) {
            showToast('error', `Tidak ada data target di tahun ${srcYear}`); return;
        }

        // Warn if target year already has data
        if (rows.length > 0) {
            if (!confirm(
                `Tahun ${tahun} sudah punya ${rows.length} baris target.\n\n` +
                `Salin dari ${srcYear} akan MENAMBAHKAN baris yang belum ada (tidak menimpa yang sudah ada).\n\n` +
                `Lanjutkan?`
            )) return;
        } else {
            if (!confirm(`Salin ${srcRows.length} baris target dari ${srcYear} ke ${tahun}?\n\nAnda bisa edit angkanya setelah disalin.`)) return;
        }

        setCopying(true);
        // upsert: skip existing (customer_name, product_name, tahun) combos
        const toInsert = srcRows.map(r => ({
            customer_name: r.customer_name,
            product_name:  r.product_name,
            target_qty:    r.target_qty,
            satuan:        r.satuan,
            tahun,
        }));

        const { error: insErr } = await supabase
            .from('product_targets')
            .upsert(toInsert, { onConflict: 'customer_name,product_name,tahun', ignoreDuplicates: true });
        setCopying(false);
        if (insErr) { showToast('error', 'Gagal salin: ' + insErr.message); return; }
        showToast('success', `${toInsert.length} baris disalin dari ${srcYear} → ${tahun}. Silakan edit angka target.`);
        loadAll();
    };

    const areaC = (a) => AREA_COLORS[a] || '#64748b';

    const ProdukInput = ({ value, onChange, placeholder }) => (
        <div style={{ position: 'relative', flex: 1 }}>
            <input value={value} onChange={e => onChange(e.target.value.toUpperCase())} placeholder={placeholder || 'GANDASIL'}
                list="produk-suggestions" style={{ ...iStyle, padding: '6px 8px' }} {...focusBlue} />
            <datalist id="produk-suggestions">
                {PRODUK_SUGGESTIONS.map(p => <option key={p} value={p} />)}
            </datalist>
        </div>
    );

    return (
        <div>
            <SecTitle icon={Users} title="Target Customer"
                desc={`Kelola target penjualan per customer per produk. Data ini dipakai halaman Program Target untuk menghitung pencapaian.`} />
            <Toast toast={toast} />

            {/* Tahun selector + actions */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, gap: 12, flexWrap: 'wrap' }}>
                {/* Year pills */}
                <div style={{ display: 'flex', gap: 6 }}>
                    {YEARS.map(y => (
                        <button key={y} onClick={() => setTahun(y)} style={{ padding: '7px 18px', borderRadius: 'var(--radius-full)', fontSize: '0.92rem', fontWeight: 700, cursor: 'pointer', background: tahun === y ? 'var(--gradient-primary)' : 'var(--bg-glass)', color: tahun === y ? 'white' : 'var(--text-secondary)', border: `1px solid ${tahun === y ? 'transparent' : 'var(--border-glass)'}`, transition: 'all 0.15s' }}>
                            {y}
                        </button>
                    ))}
                </div>

                {/* Action buttons */}
                <div style={{ display: 'flex', gap: 8 }}>
                    {/* Copy from previous year */}
                    <button
                        onClick={copyFromPrevYear}
                        disabled={copying}
                        title={`Salin semua target dari tahun ${tahun - 1} ke ${tahun}`}
                        style={{
                            display: 'flex', alignItems: 'center', gap: 6,
                            padding: '8px 14px', borderRadius: 'var(--radius-sm)',
                            border: '1px solid var(--border-glass)',
                            background: 'white', color: 'var(--text-secondary)',
                            fontSize: '0.85rem', fontWeight: 600,
                            cursor: copying ? 'not-allowed' : 'pointer',
                            opacity: copying ? 0.7 : 1, transition: 'all 0.15s',
                        }}
                        onMouseEnter={e => { if (!copying) e.currentTarget.style.background = 'var(--bg-glass-hover)'; }}
                        onMouseLeave={e => e.currentTarget.style.background = 'white'}
                    >
                        {copying
                            ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
                            : <span style={{ fontSize: '1rem', lineHeight: 1 }}>⎘</span>}
                        Salin dari {tahun - 1}
                    </button>

                    {/* New customer */}
                    <button onClick={() => { setShowNewCust(v => !v); setNewCust(showNewCust ? null : { customer_name: '', product_name: '', target_qty: '', satuan: 'DUS' }); }} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 18px', borderRadius: 'var(--radius-sm)', background: showNewCust ? 'var(--bg-glass)' : 'var(--gradient-primary)', color: showNewCust ? 'var(--text-secondary)' : 'white', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}>
                        {showNewCust ? <X size={14} /> : <Plus size={14} />}{showNewCust ? 'Tutup' : '+ Customer Baru'}
                    </button>
                </div>
            </div>

            {/* New customer form */}
            {showNewCust && newCust && (
                <div style={{ background: 'rgba(72,169,166,0.05)', border: '1px dashed var(--accent-blue)', borderRadius: 'var(--radius-md)', padding: '18px 20px', marginBottom: 20 }}>
                    <p style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--accent-blue)', marginBottom: 14 }}>+ Customer Baru (Produk pertama)</p>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 120px 90px auto', gap: 12, alignItems: 'flex-end' }}>
                        <Field label="Nama Customer">
                            <input value={newCust.customer_name} onChange={e => setNewCust(p => ({ ...p, customer_name: e.target.value }))} placeholder="PT. Nama Customer" style={iStyle} {...focusBlue} />
                        </Field>
                        <Field label="Produk (GROUP NAME)">
                            <ProdukInput value={newCust.product_name} onChange={v => setNewCust(p => ({ ...p, product_name: v }))} />
                        </Field>
                        <Field label="Target (Qty)">
                            <input value={newCust.target_qty} onChange={e => setNewCust(p => ({ ...p, target_qty: e.target.value.replace(/[^0-9]/g,'') }))} placeholder="7000" style={iStyle} {...focusBlue} />
                        </Field>
                        <Field label="Satuan">
                            <select value={newCust.satuan} onChange={e => setNewCust(p => ({ ...p, satuan: e.target.value }))} style={{ ...iStyle, cursor: 'pointer' }}>
                                {SATUAN_OPT.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </Field>
                        <BtnPrimary onClick={saveNewCust} loading={saving === 'new-cust'} icon={<Save size={14} />} label="Simpan" />
                    </div>
                    <p style={{ marginTop: 10, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                        💡 Nama customer harus PERSIS sama dengan <code style={{ background: 'var(--bg-glass)', padding: '1px 5px', borderRadius: 3 }}>invoices.customer_name</code>. Produk pakai GROUP NAME huruf kapital (contoh: GANDASIL, DEKAMON 22.43).
                    </p>
                </div>
            )}

            {/* Customer cards */}
            {loading ? (
                <div style={{ padding: 40, textAlign: 'center' }}><Loader2 size={24} style={{ animation: 'spin 1s linear infinite', color: 'var(--accent-blue)' }} /></div>
            ) : customers.length === 0 ? (
                <div style={{ padding: '48px 20px', textAlign: 'center', background: 'white', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-glass)' }}>
                    <Users size={36} color="var(--text-muted)" style={{ marginBottom: 12 }} />
                    <p style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>Belum ada target {tahun}</p>
                    <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Klik "+ Customer Baru" untuk menambahkan target pertama.</p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {customers.map(cname => {
                        const crows    = grouped[cname];
                        const am       = areaMap[cname];
                        const totalQty = crows.reduce((s, r) => s + Number(r.target_qty || 0), 0);
                        const isAddingHere = addRow?.customer_name === cname;

                        return (
                            <div key={cname} style={{ background: 'white', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-glass)', boxShadow: 'var(--shadow-sm)', overflow: 'hidden' }}>
                                {/* Customer header */}
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', background: 'var(--bg-glass)', borderBottom: '1px solid var(--border-glass)', gap: 12 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: am ? areaC(am.area) : '#cbd5e1', flexShrink: 0 }} />
                                        <div style={{ minWidth: 0 }}>
                                            <p style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{cname}</p>
                                            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 2 }}>
                                                {am ? (
                                                    <>
                                                        <span style={{ fontSize: '0.85rem', fontWeight: 700, padding: '2px 8px', borderRadius: 'var(--radius-full)', background: areaC(am.area) + '18', color: areaC(am.area) }}>{am.area}</span>
                                                        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 3 }}><MapPin size={11} />{am.kota}</span>
                                                    </>
                                                ) : (
                                                    <span style={{ fontSize: '0.85rem', color: 'var(--accent-amber)', display: 'flex', alignItems: 'center', gap: 4 }}>
                                                        <AlertCircle size={12} /> Belum di-mapping di Area & Kota
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
                                        <div style={{ textAlign: 'right' }}>
                                            <p style={{ fontSize: '0.92rem', color: 'var(--text-muted)' }}>{crows.length} produk</p>
                                            <p style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--accent-blue)' }}>{Number(totalQty).toLocaleString('id-ID')} DUS total</p>
                                        </div>
                                        <button onClick={() => setAddRow(isAddingHere ? null : { customer_name: cname, product_name: '', target_qty: '', satuan: 'DUS' })}
                                            style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 'var(--radius-sm)', background: isAddingHere ? 'var(--bg-glass)' : 'rgba(72,169,166,0.1)', color: isAddingHere ? 'var(--text-muted)' : 'var(--accent-blue)', fontSize: '0.9rem', fontWeight: 600, cursor: 'pointer', border: '1px solid rgba(72,169,166,0.2)' }}>
                                            {isAddingHere ? <X size={13} /> : <Plus size={13} />}{isAddingHere ? 'Batal' : 'Produk'}
                                        </button>
                                        <BtnDanger onClick={() => delCustomer(cname)} loading={saving === 'del-' + cname} icon={<X size={13} />} title={`Hapus semua target ${cname} tahun ${tahun}`} />
                                    </div>
                                </div>

                                {/* Product rows */}
                                <div>
                                    {/* Column header */}
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 100px 80px 90px', padding: '8px 20px', background: '#fafafa', borderBottom: '1px solid var(--border-glass)', fontSize: '0.92rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                        <span>Produk (Group Name)</span><span style={{ textAlign: 'right' }}>Target</span><span style={{ textAlign: 'center' }}>Satuan</span><span style={{ textAlign: 'right' }}>Aksi</span>
                                    </div>

                                    {crows.map((r, i) => {
                                        const isEd = editing?.id === r.id;
                                        return (
                                            <div key={r.id} style={{ display: 'grid', gridTemplateColumns: '1fr 100px 80px 90px', padding: '10px 20px', alignItems: 'center', borderBottom: i < crows.length - 1 || isAddingHere ? '1px solid var(--border-glass)' : 'none', background: isEd ? 'rgba(72,169,166,0.04)' : 'white', transition: 'background 0.15s' }}>
                                                {isEd ? (
                                                    <ProdukInput value={editing.product_name} onChange={v => setEditing(p => ({ ...p, product_name: v }))} />
                                                ) : (
                                                    <span style={{ fontWeight: 600, fontSize: '0.875rem', fontFamily: 'monospace', color: 'var(--text-primary)', letterSpacing: '0.02em' }}>{r.product_name}</span>
                                                )}
                                                {isEd ? (
                                                    <input value={editing.target_qty} onChange={e => setEditing(p => ({ ...p, target_qty: e.target.value.replace(/[^0-9]/g,'') }))} onKeyDown={e => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') setEditing(null); }} autoFocus style={{ ...iStyle, padding: '5px 8px', textAlign: 'right' }} />
                                                ) : (
                                                    <span style={{ textAlign: 'right', fontWeight: 600, fontSize: '0.875rem' }}>{Number(r.target_qty).toLocaleString('id-ID')}</span>
                                                )}
                                                {isEd ? (
                                                    <select value={editing.satuan} onChange={e => setEditing(p => ({ ...p, satuan: e.target.value }))} style={{ ...iStyle, padding: '5px 6px', textAlign: 'center', cursor: 'pointer' }}>
                                                        {SATUAN_OPT.map(s => <option key={s} value={s}>{s}</option>)}
                                                    </select>
                                                ) : (
                                                    <span style={{ textAlign: 'center', fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-muted)' }}>{r.satuan}</span>
                                                )}
                                                <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                                                    {isEd ? (
                                                        <><BtnPrimary onClick={saveEdit} loading={saving === r.id} icon={<Save size={12} />} label="OK" /><BtnGhost onClick={() => setEditing(null)} label="✕" /></>
                                                    ) : (
                                                        <><BtnGhost onClick={() => setEditing({ id: r.id, product_name: r.product_name, target_qty: r.target_qty, satuan: r.satuan })} icon={<Pencil size={12} />} title="Edit" /><BtnDanger onClick={() => del(r.id, r.product_name)} loading={saving === r.id} icon={<X size={12} />} title="Hapus" /></>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}

                                    {/* Inline add row */}
                                    {isAddingHere && (
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 100px 80px 90px', padding: '10px 20px', alignItems: 'center', background: 'rgba(72,169,166,0.03)', borderTop: '1px dashed rgba(72,169,166,0.3)' }}>
                                            <ProdukInput value={addRow.product_name} onChange={v => setAddRow(p => ({ ...p, product_name: v }))} placeholder="GANDASIL" />
                                            <input value={addRow.target_qty} onChange={e => setAddRow(p => ({ ...p, target_qty: e.target.value.replace(/[^0-9]/g,'') }))} onKeyDown={e => e.key === 'Enter' && saveAddRow()} placeholder="7000" style={{ ...iStyle, padding: '5px 8px', textAlign: 'right' }} {...focusBlue} />
                                            <select value={addRow.satuan} onChange={e => setAddRow(p => ({ ...p, satuan: e.target.value }))} style={{ ...iStyle, padding: '5px 6px', cursor: 'pointer' }}>
                                                {SATUAN_OPT.map(s => <option key={s} value={s}>{s}</option>)}
                                            </select>
                                            <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                                                <BtnPrimary onClick={saveAddRow} loading={saving === 'add-' + cname} icon={<Save size={12} />} label="+" />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Summary footer */}
            {customers.length > 0 && (
                <div style={{ marginTop: 16, padding: '12px 16px', borderRadius: 'var(--radius-sm)', background: 'var(--bg-glass)', border: '1px solid var(--border-glass)', display: 'flex', gap: 24, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '0.92rem', color: 'var(--text-muted)' }}><strong style={{ color: 'var(--text-primary)' }}>{customers.length}</strong> customer target</span>
                    <span style={{ fontSize: '0.92rem', color: 'var(--text-muted)' }}><strong style={{ color: 'var(--text-primary)' }}>{rows.length}</strong> baris target produk</span>
                    <span style={{ fontSize: '0.92rem', color: 'var(--text-muted)' }}>Tahun <strong style={{ color: 'var(--accent-blue)' }}>{tahun}</strong></span>
                    <span style={{ fontSize: '0.92rem', color: 'var(--accent-amber)' }}>
                        {customers.filter(c => !areaMap[c]).length > 0
                            ? `⚠️ ${customers.filter(c => !areaMap[c]).length} customer belum di-mapping di tab Area & Kota`
                            : '✓ Semua customer sudah di-mapping'}
                    </span>
                </div>
            )}
        </div>
    );
}

// ─── Placeholder Tab ──────────────────────────────────────────────────────────
function TabPlaceholder({ tab }) {
    return (
        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--bg-glass)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                <tab.icon size={28} color="var(--accent-blue)" />
            </div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: 8 }}>{tab.label}</h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', maxWidth: 320, margin: '0 auto', lineHeight: 1.6 }}>Akan dibangun di sesi berikutnya.</p>
            <div style={{ display: 'inline-block', marginTop: 20, padding: '5px 14px', borderRadius: 'var(--radius-full)', background: 'rgba(242,153,74,0.1)', border: '1px solid rgba(242,153,74,0.3)', fontSize: '0.85rem', fontWeight: 700, color: 'var(--accent-amber)' }}>FASE 1 · COMING SOON</div>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Settings Page — Container
// ═══════════════════════════════════════════════════════════════════════════════
export default function SettingsPage() {
    const [activeTab, setActiveTab] = useState('target-penjualan');

    const renderContent = () => {
        const tab = TABS.find(t => t.id === activeTab);
        if (activeTab === 'target-penjualan')  return <TabTargetPenjualan />;
        if (activeTab === 'profil-perusahaan') return <TabProfilPerusahaan />;
        if (activeTab === 'area-kota')         return <TabAreaKota />;
        if (activeTab === 'target-customer')   return <TabTargetCustomer />;
        if (activeTab === 'auth-user')         return <TabAuthUser />;
        return <TabPlaceholder tab={tab} />;
    };

    return (
        <div style={{ padding: '32px 40px', maxWidth: 1400, margin: '0 auto' }}>
            <div style={{ marginBottom: 32 }}>
                <h1 style={{ fontSize: '1.6rem', fontWeight: 800, marginBottom: 6 }}>⚙️ Settings</h1>
                <p style={{ fontSize: '1rem', color: 'var(--text-secondary)' }}>Konfigurasi sistem · Fase 1</p>
            </div>

            <div style={{ display: 'flex', gap: 28, alignItems: 'flex-start' }}>
                {/* Left nav */}
                <div style={{ width: 256, flexShrink: 0, background: 'white', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-glass)', boxShadow: 'var(--shadow-sm)', overflow: 'hidden' }}>
                    <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border-glass)', fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Fase 1</div>
                    {TABS.map(tab => {
                        const isActive = activeTab === tab.id;
                        return (
                            <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', padding: '14px 18px', borderBottom: '1px solid var(--border-glass)', background: isActive ? 'var(--bg-glass-active)' : 'transparent', color: isActive ? 'var(--accent-blue)' : 'var(--text-secondary)', fontSize: '0.95rem', fontWeight: isActive ? 600 : 400, textAlign: 'left', cursor: 'pointer', transition: 'all 0.15s', borderLeft: isActive ? '3px solid var(--accent-blue)' : '3px solid transparent' }}
                                onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'var(--bg-glass)'; }}
                                onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}>
                                <tab.icon size={18} style={{ flexShrink: 0 }} />
                                <span style={{ flex: 1 }}>{tab.label}</span>
                                {tab.done
                                    ? isActive && <ChevronRight size={16} style={{ opacity: 0.5 }} />
                                    : <span style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--accent-amber)', background: 'rgba(242,153,74,0.12)', padding: '3px 8px', borderRadius: 4 }}>PLAN</span>}
                            </button>
                        );
                    })}
                </div>

                {/* Content */}
                <div style={{ flex: 1, minWidth: 0, background: 'white', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-glass)', boxShadow: 'var(--shadow-sm)', padding: 36 }}>
                    {renderContent()}
                </div>
            </div>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
    );
}