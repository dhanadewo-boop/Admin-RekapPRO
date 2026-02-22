import { useState, useEffect } from 'react';
import { subscribeTargets, setTarget } from '../lib/db';
import { useAuth } from '../contexts/AuthContext';
import { canManageTargets } from '../lib/auth';
import ProgressBar from '../components/ProgressBar';
import { Target, Plus, X, Award, TrendingUp } from 'lucide-react';

export default function TargetsPage() {
    const { user } = useAuth();
    const [targets, setTargets] = useState([]);
    const [showForm, setShowForm] = useState(false);
    const [newCustomer, setNewCustomer] = useState('');
    const [newTarget, setNewTarget] = useState('');
    const [saving, setSaving] = useState(false);

    useEffect(() => { const u = subscribeTargets(setTargets); return u; }, []);

    const handleAdd = async () => {
        if (!newCustomer.trim() || !newTarget) return;
        setSaving(true);
        try {
            await setTarget(newCustomer.trim(), parseFloat(newTarget));
            setNewCustomer(''); setNewTarget(''); setShowForm(false);
        } catch (e) { console.error(e); }
        setSaving(false);
    };

    const completed = targets.filter(t => t.currentAmount >= t.targetAmount).length;
    const fRp = (n) => `Rp ${(n || 0).toLocaleString('id-ID')}`;

    return (
        <div className="animate-fade-in">
            <div className="page-header">
                <h1>Target per Customer</h1>
                <p>Pantau pencapaian target program pelanggan</p>
            </div>

            {/* Summary */}
            <div style={{ display: 'flex', gap: 16, marginBottom: 20, flexWrap: 'wrap' }}>
                <div className="glass-card" style={{ padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Target size={18} color="var(--accent-amber)" />
                    <div><p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>TOTAL TARGET</p>
                        <p style={{ fontSize: '1.1rem', fontWeight: 700 }}>{targets.length}</p></div>
                </div>
                <div className="glass-card" style={{ padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Award size={18} color="var(--accent-emerald)" />
                    <div><p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>TERCAPAI</p>
                        <p style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--accent-emerald)' }}>{completed} / {targets.length}</p></div>
                </div>
                {canManageTargets(user) && (
                    <button className="btn btn-primary" onClick={() => setShowForm(true)} style={{ marginLeft: 'auto' }}>
                        <Plus size={16} /> Tambah Target
                    </button>
                )}
            </div>

            {/* Add Form */}
            {showForm && (
                <div className="glass-card animate-fade-in" style={{ marginBottom: 20 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                        <h3 style={{ fontSize: '0.9rem', fontWeight: 600 }}>Tambah Target Baru</h3>
                        <button className="btn-icon" onClick={() => setShowForm(false)}><X size={18} /></button>
                    </div>
                    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'end' }}>
                        <div className="form-group" style={{ flex: 1, minWidth: 200 }}>
                            <label>Nama Customer</label>
                            <input value={newCustomer} onChange={e => setNewCustomer(e.target.value)} placeholder="CV. Subur Makmur" />
                        </div>
                        <div className="form-group" style={{ flex: 1, minWidth: 200 }}>
                            <label>Target (Rp)</label>
                            <input type="number" value={newTarget} onChange={e => setNewTarget(e.target.value)} placeholder="10000000" />
                        </div>
                        <button className="btn btn-success" onClick={handleAdd} disabled={saving}>
                            {saving ? 'Menyimpan...' : 'Simpan'}
                        </button>
                    </div>
                </div>
            )}

            {/* Target List */}
            {targets.length === 0 ? (
                <div className="glass-card">
                    <div className="empty-state">
                        <Target /><h3>Belum Ada Target</h3>
                        <p>Tambahkan target program untuk customer</p>
                    </div>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {targets.map(t => {
                        const pct = t.targetAmount > 0 ? Math.min(Math.round((t.currentAmount / t.targetAmount) * 100), 100) : 0;
                        const done = pct >= 100;
                        return (
                            <div key={t.id} className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
                                <div style={{
                                    width: 44, height: 44, borderRadius: 'var(--radius-md)',
                                    background: done ? 'var(--accent-emerald-glow)' : 'var(--accent-amber-glow)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                                }}>
                                    {done ? <Award size={20} color="var(--accent-emerald)" /> : <Target size={20} color="var(--accent-amber)" />}
                                </div>
                                <div style={{ flex: 1, minWidth: 200 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                                        <span style={{ fontWeight: 600 }}>{t.customerName}</span>
                                        {done && <span className="badge badge-emerald">✓ Tercapai</span>}
                                    </div>
                                    <ProgressBar value={t.currentAmount || 0} max={t.targetAmount || 1} />
                                </div>
                                <div style={{ textAlign: 'right', minWidth: 120 }}>
                                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Pencapaian</p>
                                    <p style={{ fontSize: '1.1rem', fontWeight: 700, color: done ? 'var(--accent-emerald)' : 'var(--accent-blue)' }}>{pct}%</p>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
