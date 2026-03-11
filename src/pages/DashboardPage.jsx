import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { subscribeStats, subscribeInvoices, subscribeProducts } from '../lib/db';
import StatCard from '../components/StatCard';
import { FileText, Users, Package, Target, TrendingUp, Clock, PieChart as PieIcon } from 'lucide-react';
import {
    AreaChart, Area, PieChart, Pie, Cell, XAxis, YAxis,
    CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend
} from 'recharts';

export default function DashboardPage() {
    const { user } = useAuth();
    const [stats, setStats] = useState({
        totalInvoices: 0, totalRevenue: 0,
        totalCustomers: 0, totalProducts: 0,
        totalProductsSold: 0, totalTargets: 0, targetsCompleted: 0
    });
    const [recentInvoices, setRecentInvoices] = useState([]);
    const [monthlyData, setMonthlyData] = useState([]);
    const [topProducts, setTopProducts] = useState([]);

    const COLORS = ['#48A9A6', '#5B9EA6', '#F2994A', '#2ECC71', '#E74C3C'];

    useEffect(() => {
        const unsubStats = subscribeStats(setStats);

        const unsubInv = subscribeInvoices((invoices) => {
            setRecentInvoices(invoices.slice(0, 5));

            const currentYear = new Date().getFullYear();
            const monthly = Array(12).fill(0);
            const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

            invoices.forEach(inv => {
                if (inv.invoiceDate && inv.invoiceDate.includes(currentYear.toString())) {
                    const parts = inv.invoiceDate.split('-');
                    if (parts.length === 3) {
                        const mIndex = MONTH_NAMES.indexOf(parts[1]);
                        if (mIndex !== -1) {
                            monthly[mIndex] += (inv.totalAmount || 0);
                        }
                    }
                }
            });

            const formattedMonthly = MONTH_NAMES.map((m, i) => ({
                name: m,
                omset: monthly[i]
            }));
            setMonthlyData(formattedMonthly);
        });

        const unsubProd = subscribeProducts((prods) => {
            const sorted = [...prods].sort((a, b) => (b.totalRevenue || 0) - (a.totalRevenue || 0));
            const top = sorted.slice(0, 4);
            const others = sorted.slice(4).reduce((sum, p) => sum + (p.totalRevenue || 0), 0);

            const pieData = top.map(p => ({
                name: p.name,
                value: p.totalRevenue || 0
            }));
            if (others > 0) {
                pieData.push({ name: 'Lainnya', value: others });
            }
            setTopProducts(pieData.filter(d => d.value > 0));
        });

        return () => { unsubStats(); unsubInv(); unsubProd(); };
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

            {/* Charts Section */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 'var(--space-md)', marginBottom: 'var(--space-xl)' }}>
                {/* Tren Omset Bulanan */}
                <div className="glass-card">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
                        <TrendingUp size={18} color="var(--accent-blue)" />
                        <h2 style={{ fontSize: '1rem', fontWeight: 600 }}>Tren Omset ({new Date().getFullYear()})</h2>
                    </div>
                    <div style={{ width: '100%', height: 300 }}>
                        <ResponsiveContainer>
                            <AreaChart data={monthlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorOmset" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="var(--accent-blue)" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="var(--accent-blue)" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-glass)" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--text-muted)' }} />
                                <YAxis
                                    axisLine={false} tickLine={false}
                                    tick={{ fontSize: 12, fill: 'var(--text-muted)' }}
                                    tickFormatter={(val) => `Rp${(val / 1000000).toFixed(0)}M`}
                                />
                                <RechartsTooltip
                                    formatter={(value) => formatRp(value)}
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: 'var(--shadow-md)', background: 'var(--bg-card)' }}
                                />
                                <Area type="monotone" dataKey="omset" stroke="var(--accent-blue)" strokeWidth={3} fillOpacity={1} fill="url(#colorOmset)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Kontribusi Top Produk */}
                <div className="glass-card">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
                        <PieIcon size={18} color="var(--accent-purple)" />
                        <h2 style={{ fontSize: '1rem', fontWeight: 600 }}>Kontribusi Top Produk</h2>
                    </div>
                    <div style={{ width: '100%', height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {topProducts.length > 0 ? (
                            <ResponsiveContainer>
                                <PieChart>
                                    <Pie
                                        data={topProducts}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={100}
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {topProducts.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <RechartsTooltip
                                        formatter={(value) => formatRp(value)}
                                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: 'var(--shadow-md)', background: 'var(--bg-card)' }}
                                    />
                                    <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '0.8rem' }} />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <p style={{ color: 'var(--text-muted)' }}>Belum ada data penjualan produk</p>
                        )}
                    </div>
                </div>
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
