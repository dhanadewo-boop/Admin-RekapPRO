import { useState, useEffect } from 'react';
import { subscribeInvoices } from '../lib/db';
import DataTable from '../components/DataTable';
import { FileText } from 'lucide-react';

export default function InvoicesPage() {
    const [invoices, setInvoices] = useState([]);

    useEffect(() => {
        const unsub = subscribeInvoices(setInvoices);
        return unsub;
    }, []);

    const formatRp = (n) => `Rp ${(n || 0).toLocaleString('id-ID')}`;

    const columns = [
        {
            key: 'no',
            header: '#',
            sortable: false,
            render: (_, i) => <span style={{ color: 'var(--text-muted)' }}>{i + 1}</span>,
            accessor: () => ''
        },
        {
            key: 'invoiceNumber',
            header: 'No. Invoice',
            accessor: 'invoiceNumber',
            render: (row) => (
                <span style={{ fontWeight: 600 }}>{row.invoiceNumber || '-'}</span>
            )
        },
        {
            key: 'customerName',
            header: 'Customer',
            accessor: 'customerName',
            render: (row) => (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{
                        width: 32, height: 32, borderRadius: 'var(--radius-sm)',
                        background: 'var(--accent-purple-glow)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent-purple)',
                        flexShrink: 0
                    }}>
                        {(row.customerName || '?').charAt(0).toUpperCase()}
                    </div>
                    <span>{row.customerName || '-'}</span>
                </div>
            )
        },
        {
            key: 'invoiceDate',
            header: 'Tanggal',
            accessor: 'invoiceDate',
            render: (row) => (
                <span style={{ color: 'var(--text-secondary)' }}>{row.invoiceDate || '-'}</span>
            )
        },
        {
            key: 'products',
            header: 'Produk',
            accessor: (row) => row.products?.length || 0,
            render: (row) => (
                <span className="badge badge-blue">{row.products?.length || 0} item</span>
            )
        },
        {
            key: 'totalAmount',
            header: 'Total',
            accessor: 'totalAmount',
            render: (row) => (
                <span style={{ fontWeight: 600, color: 'var(--accent-emerald)' }}>
                    {formatRp(row.totalAmount)}
                </span>
            )
        },
        {
            key: 'status',
            header: 'Status',
            accessor: 'status',
            render: (row) => (
                <span className={`badge ${row.status === 'confirmed' ? 'badge-emerald' : 'badge-amber'}`}>
                    {row.status === 'confirmed' ? '✓ Confirmed' : 'Pending'}
                </span>
            )
        }
    ];

    // Fix the render with index
    const columnsFixed = columns.map(col => {
        if (col.key === 'no') {
            return {
                ...col,
                render: undefined, // Will use custom rendering below
            };
        }
        return col;
    });

    return (
        <div className="animate-fade-in">
            <div className="page-header">
                <h1>Rekap Invoice</h1>
                <p>Semua invoice yang telah diproses dan diverifikasi</p>
            </div>

            {/* Summary */}
            <div style={{
                display: 'flex', gap: 16, marginBottom: 20, flexWrap: 'wrap'
            }}>
                <div className="glass-card" style={{
                    padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 10
                }}>
                    <FileText size={18} color="var(--accent-blue)" />
                    <div>
                        <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>TOTAL INVOICE</p>
                        <p style={{ fontSize: '1.1rem', fontWeight: 700 }}>{invoices.length}</p>
                    </div>
                </div>
                <div className="glass-card" style={{
                    padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 10
                }}>
                    <span style={{ fontSize: '1.1rem' }}>💰</span>
                    <div>
                        <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>TOTAL NILAI</p>
                        <p style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--accent-emerald)' }}>
                            {formatRp(invoices.reduce((sum, inv) => sum + (inv.totalAmount || 0), 0))}
                        </p>
                    </div>
                </div>
            </div>

            <DataTable
                columns={columns}
                data={invoices}
                searchPlaceholder="Cari invoice, customer..."
            />
        </div>
    );
}
