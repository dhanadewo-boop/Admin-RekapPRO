import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { subscribeStats, subscribeInvoices } from '../lib/db';
import StatCard from '../components/StatCard';
import { FileText, Users, Package, Target, TrendingUp, Clock } from 'lucide-react';

export default function DashboardPage() {
    const { user } = useAuth();
    const [stats, setStats] = useState({
        totalInvoices: 0, totalRevenue: 0,
        totalCustomers: 0, totalProducts: 0,
        totalProductsSold: 0, totalTargets: 0, targetsCompleted: 0
    });
    const [recentInvoices, setRecentInvoices] = useState([]);

    useEffect(() => {
        const unsubStats = subscribeStats(setStats);
        const unsubInv = subscribeInvoices((invoices) => {
            setRecentInvoices(invoices.slice(0, 5));
        });
        return () => { unsubStats(); unsubInv(); };
    }, []);

    const formatRp = (n) => `Rp ${(n || 0).toLocaleString('id-ID')}`;

    return (
        <div className="animate-fade-in">
            <div className="page-header">
                <h1>Dashboard</h1>
                <p>Selamat datang kembali, {user?.name || user?.email} 👋</p>
            </div>

            {/* KPI Stats */}
            <div className="stats-grid">
                <StatCard
                    icon={FileText}
                    label="Total Invoice"
                    value={stats.totalInvoices}
                    subtext={formatRp(stats.totalRevenue)}
                    color="var(--accent-blue)"
                    glowColor="var(--accent-blue-glow)"
                />
                <StatCard
                    icon={Users}
                    label="Total Customer"
                    value={stats.totalCustomers}
                    color="var(--accent-purple)"
                    glowColor="var(--accent-purple-glow)"
                />
                <StatCard
                    icon={Package}
                    label="Produk Terjual"
                    value={stats.totalProductsSold?.toLocaleString('id-ID') || 0}
                    subtext={`${stats.totalProducts} jenis produk`}
                    color="var(--accent-emerald)"
                    glowColor="var(--accent-emerald-glow)"
                />
                <StatCard
                    icon={Target}
                    label="Target Tercapai"
                    value={`${stats.targetsCompleted}/${stats.totalTargets}`}
                    subtext={stats.totalTargets > 0 ? `${Math.round((stats.targetsCompleted / stats.totalTargets) * 100)}% selesai` : 'Belum ada target'}
                    color="var(--accent-amber)"
                    glowColor="var(--accent-amber-glow)"
                />
            </div>

            {/* Recent Activity */}
            <div className="glass-card">
                <div style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    marginBottom: 20
                }}>
                    <Clock size={18} color="var(--accent-blue)" />
                    <h2 style={{ fontSize: '1rem', fontWeight: 600 }}>Invoice Terbaru</h2>
                </div>

                {recentInvoices.length === 0 ? (
                    <div className="empty-state">
                        <FileText />
                        <h3>Belum Ada Invoice</h3>
                        <p>Invoice yang telah diproses akan tampil di sini</p>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {recentInvoices.map((inv, i) => (
                            <div key={inv.id || i} style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                padding: '12px 16px', borderRadius: 'var(--radius-sm)',
                                background: 'var(--bg-glass)', border: '1px solid var(--border-glass)',
                                transition: 'background var(--transition-fast)'
                            }}
                                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-glass-hover)'}
                                onMouseLeave={e => e.currentTarget.style.background = 'var(--bg-glass)'}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                    <div style={{
                                        width: 36, height: 36, borderRadius: 'var(--radius-sm)',
                                        background: 'var(--accent-blue-glow)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                                    }}>
                                        <FileText size={16} color="var(--accent-blue)" />
                                    </div>
                                    <div>
                                        <p style={{ fontSize: '0.85rem', fontWeight: 500 }}>
                                            {inv.customerName || 'Unknown'}
                                        </p>
                                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                            {inv.invoiceNumber || '-'} • {inv.invoiceDate || '-'}
                                        </p>
                                    </div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <p style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--accent-emerald)' }}>
                                        {formatRp(inv.totalAmount)}
                                    </p>
                                    <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                                        {inv.products?.length || 0} produk
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
