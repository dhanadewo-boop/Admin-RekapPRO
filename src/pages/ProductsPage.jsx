import { useState, useEffect } from 'react';
import { subscribeProducts } from '../lib/db';
import DataTable from '../components/DataTable';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Package, TrendingUp } from 'lucide-react';

const COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#f43f5e', '#06b6d4', '#ec4899', '#84cc16', '#f97316', '#6366f1'];

export default function ProductsPage() {
    const [products, setProducts] = useState([]);
    useEffect(() => { const u = subscribeProducts(setProducts); return u; }, []);

    const fRp = (n) => `Rp ${(n || 0).toLocaleString('id-ID')}`;
    const top = products.slice(0, 10);

    const columns = [
        {
            key: 'name', header: 'Nama Produk', accessor: 'name',
            render: r => (<div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 32, height: 32, borderRadius: 'var(--radius-sm)', background: 'var(--accent-emerald-glow)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Package size={14} color="var(--accent-emerald)" /></div>
                <span style={{ fontWeight: 500 }}>{r.name}</span></div>)
        },
        {
            key: 'totalSold', header: 'Total Terjual', accessor: 'totalSold',
            render: r => <span className="badge badge-blue">{(r.totalSold || 0).toLocaleString('id-ID')} unit</span>
        },
        {
            key: 'totalRevenue', header: 'Total Pendapatan', accessor: 'totalRevenue',
            render: r => <span style={{ fontWeight: 600, color: 'var(--accent-emerald)' }}>{fRp(r.totalRevenue)}</span>
        }
    ];

    return (
        <div className="animate-fade-in">
            <div className="page-header"><h1>Rekap per Produk</h1><p>Statistik penjualan dan perputaran barang</p></div>
            <div style={{ display: 'flex', gap: 16, marginBottom: 20, flexWrap: 'wrap' }}>
                <div className="glass-card" style={{ padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Package size={18} color="var(--accent-emerald)" />
                    <div><p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>JENIS PRODUK</p>
                        <p style={{ fontSize: '1.1rem', fontWeight: 700 }}>{products.length}</p></div></div>
                <div className="glass-card" style={{ padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 10 }}>
                    <TrendingUp size={18} color="var(--accent-blue)" />
                    <div><p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>TOTAL UNIT TERJUAL</p>
                        <p style={{ fontSize: '1.1rem', fontWeight: 700 }}>{products.reduce((s, p) => s + (p.totalSold || 0), 0).toLocaleString('id-ID')}</p></div></div>
            </div>
            {top.length > 0 && (
                <div className="glass-card" style={{ marginBottom: 20, padding: '20px 20px 10px' }}>
                    <h3 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <TrendingUp size={16} color="var(--accent-blue)" /> Top Produk Terlaris</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={top} layout="vertical" margin={{ left: 20 }}>
                            <XAxis type="number" tick={{ fill: 'var(--text-muted)', fontSize: 12 }} />
                            <YAxis type="category" dataKey="name" tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} width={120} />
                            <Tooltip contentStyle={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-glass)', borderRadius: 8 }} />
                            <Bar dataKey="totalSold" radius={[0, 6, 6, 0]} maxBarSize={32}>
                                {top.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            )}
            <DataTable columns={columns} data={products} searchPlaceholder="Cari nama produk..." />
        </div>
    );
}
