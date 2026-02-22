import { useState, useEffect } from 'react';
import { subscribeCustomers } from '../lib/db';
import DataTable from '../components/DataTable';
import { Users } from 'lucide-react';

export default function CustomersPage() {
    const [customers, setCustomers] = useState([]);

    useEffect(() => {
        const unsub = subscribeCustomers(setCustomers);
        return unsub;
    }, []);

    const formatRp = (n) => `Rp ${(n || 0).toLocaleString('id-ID')}`;

    const columns = [
        {
            key: 'name',
            header: 'Nama Customer',
            accessor: 'name',
            render: (row) => (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                        width: 36, height: 36, borderRadius: 'var(--radius-sm)',
                        background: 'var(--gradient-primary)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '0.8rem', fontWeight: 700, color: 'white', flexShrink: 0
                    }}>
                        {(row.name || '?').charAt(0).toUpperCase()}
                    </div>
                    <span style={{ fontWeight: 500 }}>{row.name}</span>
                </div>
            )
        },
        {
            key: 'jumlahInvoice',
            header: 'Jumlah Invoice',
            accessor: 'jumlahInvoice',
            render: (row) => (
                <span className="badge badge-blue">{row.jumlahInvoice || 0} invoice</span>
            )
        },
        {
            key: 'totalTransaksi',
            header: 'Total Transaksi',
            accessor: 'totalTransaksi',
            render: (row) => (
                <span style={{ fontWeight: 600, color: 'var(--accent-emerald)' }}>
                    {formatRp(row.totalTransaksi)}
                </span>
            )
        },
        {
            key: 'avgPerInvoice',
            header: 'Rata-rata / Invoice',
            accessor: (row) => row.jumlahInvoice > 0 ? row.totalTransaksi / row.jumlahInvoice : 0,
            render: (row) => (
                <span style={{ color: 'var(--text-secondary)' }}>
                    {row.jumlahInvoice > 0
                        ? formatRp(Math.round(row.totalTransaksi / row.jumlahInvoice))
                        : '-'}
                </span>
            )
        }
    ];

    return (
        <div className="animate-fade-in">
            <div className="page-header">
                <h1>Rekap per Customer</h1>
                <p>Ringkasan transaksi masing-masing pelanggan</p>
            </div>

            {/* Summary */}
            <div style={{ display: 'flex', gap: 16, marginBottom: 20, flexWrap: 'wrap' }}>
                <div className="glass-card" style={{
                    padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 10
                }}>
                    <Users size={18} color="var(--accent-purple)" />
                    <div>
                        <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>TOTAL CUSTOMER</p>
                        <p style={{ fontSize: '1.1rem', fontWeight: 700 }}>{customers.length}</p>
                    </div>
                </div>
                <div className="glass-card" style={{
                    padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 10
                }}>
                    <span style={{ fontSize: '1.1rem' }}>💰</span>
                    <div>
                        <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>TOTAL TRANSAKSI</p>
                        <p style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--accent-emerald)' }}>
                            {formatRp(customers.reduce((sum, c) => sum + (c.totalTransaksi || 0), 0))}
                        </p>
                    </div>
                </div>
            </div>

            <DataTable
                columns={columns}
                data={customers}
                searchPlaceholder="Cari nama customer..."
            />
        </div>
    );
}
