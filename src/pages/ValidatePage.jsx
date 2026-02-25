import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { distributeInvoice } from '../lib/distributionEngine';
import { Plus, Trash2, CheckCircle, ArrowLeft, AlertCircle } from 'lucide-react';

export default function ValidatePage() {
    const navigate = useNavigate();
    const [imageUrl, setImageUrl] = useState('');
    const [imageBlob, setImageBlob] = useState(null);
    const [saving, setSaving] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState('');

    const [formData, setFormData] = useState({
        customerName: '',
        invoiceNumber: '',
        invoiceDate: '',
        products: [{ name: '', qty: 1, unitPrice: 0, subtotal: 0 }],
        discount: 0,
        totalAmount: 0
    });

    useEffect(() => {
        // Load OCR results from sessionStorage
        const ocrResult = sessionStorage.getItem('ocrResult');
        const ocrImage = sessionStorage.getItem('ocrImage');
        const ocrImageData = sessionStorage.getItem('ocrImageData');

        if (ocrResult) {
            const parsed = JSON.parse(ocrResult);
            setFormData({
                customerName: parsed.customerName || '',
                invoiceNumber: parsed.invoiceNumber || '',
                invoiceDate: parsed.invoiceDate || '',
                products: parsed.products?.length > 0
                    ? parsed.products
                    : [{ name: '', qty: 1, unitPrice: 0, subtotal: 0 }],
                discount: parsed.discount || 0,
                totalAmount: parsed.totalAmount || 0
            });
        }

        if (ocrImage) setImageUrl(ocrImage);
        if (ocrImageData) {
            // Convert base64 back to blob
            fetch(ocrImageData)
                .then(r => r.blob())
                .then(b => setImageBlob(b));
        }
    }, []);

    const updateField = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const updateProduct = (index, field, value) => {
        setFormData(prev => {
            const products = [...prev.products];
            products[index] = { ...products[index], [field]: value };
            // Auto-calculate subtotal
            if (field === 'qty' || field === 'unitPrice') {
                products[index].subtotal = products[index].qty * products[index].unitPrice;
            }
            // Auto-calculate total with discount
            const subtotal = products.reduce((sum, p) => sum + (p.subtotal || 0), 0);
            const totalAmount = Math.round(subtotal * (1 - (prev.discount || 0) / 100));
            return { ...prev, products, totalAmount };
        });
    };

    const updateDiscount = (discValue) => {
        setFormData(prev => {
            const disc = parseFloat(discValue) || 0;
            const subtotal = prev.products.reduce((sum, p) => sum + (p.subtotal || 0), 0);
            const totalAmount = Math.round(subtotal * (1 - disc / 100));
            return { ...prev, discount: disc, totalAmount };
        });
    };

    const addProduct = () => {
        setFormData(prev => ({
            ...prev,
            products: [...prev.products, { name: '', qty: 1, unitPrice: 0, subtotal: 0 }]
        }));
    };

    const removeProduct = (index) => {
        setFormData(prev => {
            const products = prev.products.filter((_, i) => i !== index);
            const totalAmount = products.reduce((sum, p) => sum + (p.subtotal || 0), 0);
            return { ...prev, products, totalAmount };
        });
    };

    const handleConfirm = async () => {
        // Validation
        if (!formData.customerName.trim()) {
            setError('Nama customer harus diisi');
            return;
        }
        if (formData.products.length === 0 || !formData.products[0].name) {
            setError('Minimal satu produk harus diisi');
            return;
        }

        setSaving(true);
        setError('');

        try {
            await distributeInvoice(formData, imageBlob);
            setSuccess(true);
            // Clean up sessionStorage
            sessionStorage.removeItem('ocrResult');
            sessionStorage.removeItem('ocrImage');
            sessionStorage.removeItem('ocrImageData');
            // Redirect after 2 seconds
            setTimeout(() => navigate('/invoices'), 2000);
        } catch (err) {
            console.error('Save error:', err);
            setError('Gagal menyimpan data. Silakan coba lagi.');
            setSaving(false);
        }
    };

    const formatRp = (n) => `Rp ${(n || 0).toLocaleString('id-ID')}`;

    if (success) {
        return (
            <div className="animate-fade-in" style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                justifyContent: 'center', minHeight: '60vh', textAlign: 'center'
            }}>
                <div style={{
                    width: 80, height: 80, borderRadius: '50%',
                    background: 'var(--accent-emerald-glow)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    marginBottom: 20, boxShadow: '0 0 40px rgba(16, 185, 129, 0.3)'
                }}>
                    <CheckCircle size={40} color="var(--accent-emerald)" />
                </div>
                <h2 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: 8 }}>
                    Invoice Berhasil Direkap! 🎉
                </h2>
                <p style={{ color: 'var(--text-secondary)', marginBottom: 4 }}>
                    Data telah didistribusikan ke rekap customer, produk, dan target.
                </p>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                    Mengalihkan ke halaman Rekap Invoice...
                </p>
            </div>
        );
    }

    return (
        <div className="animate-fade-in">
            <div className="page-header">
                <button
                    onClick={() => navigate('/scan')}
                    className="btn btn-secondary"
                    style={{ marginBottom: 12 }}
                >
                    <ArrowLeft size={16} />
                    Kembali ke Scan
                </button>
                <h1>Validasi Data Invoice</h1>
                <p>Periksa dan edit data hasil OCR sebelum disimpan ke database</p>
            </div>

            {error && (
                <div style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '12px 16px', borderRadius: 'var(--radius-sm)',
                    background: 'var(--accent-rose-glow)', color: 'var(--accent-rose)',
                    marginBottom: 16, fontSize: '0.85rem'
                }}>
                    <AlertCircle size={18} />
                    {error}
                </div>
            )}

            <div className="validate-layout">
                {/* Left: Original Image */}
                <div className="validate-image-panel">
                    <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
                        <div style={{
                            padding: '12px 16px', borderBottom: '1px solid var(--border-glass)',
                            fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)',
                            textTransform: 'uppercase', letterSpacing: '0.05em'
                        }}>
                            📄 Invoice Asli
                        </div>
                        {imageUrl ? (
                            <img src={imageUrl} alt="Invoice asli" style={{
                                width: '100%', display: 'block'
                            }} />
                        ) : (
                            <div className="empty-state" style={{ padding: 40 }}>
                                <p>Tidak ada gambar</p>
                            </div>
                        )}
                        {imageUrl && (
                            <div style={{
                                padding: '8px 12px',
                                fontSize: '0.75rem',
                                color: 'var(--text-muted)',
                                borderTop: '1px solid var(--border-glass)'
                            }}>
                                Preview diperbesar untuk memudahkan validasi data OCR.
                            </div>
                        )}
                    </div>
                </div>

                {/* Right: Editable Form */}
                <div className="validate-form-panel">
                    <div className="glass-card">
                        <h3 style={{
                            fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)',
                            textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 16
                        }}>
                            📝 Data Terdeteksi
                        </h3>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                            <div className="form-group">
                                <label>Nama Customer</label>
                                <input
                                    type="text"
                                    value={formData.customerName}
                                    onChange={e => updateField('customerName', e.target.value)}
                                    placeholder="CV. Subur Makmur"
                                />
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                <div className="form-group">
                                    <label>No. Invoice</label>
                                    <input
                                        type="text"
                                        value={formData.invoiceNumber}
                                        onChange={e => updateField('invoiceNumber', e.target.value)}
                                        placeholder="INV-001"
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Tanggal</label>
                                    <input
                                        type="text"
                                        value={formData.invoiceDate}
                                        onChange={e => updateField('invoiceDate', e.target.value)}
                                        placeholder="21/02/2026"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Products */}
                    <div className="glass-card">
                        <div style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            marginBottom: 16
                        }}>
                            <h3 style={{
                                fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)',
                                textTransform: 'uppercase', letterSpacing: '0.05em'
                            }}>
                                📦 Daftar Produk
                            </h3>
                            <button className="btn btn-secondary" onClick={addProduct} style={{
                                padding: '6px 12px', fontSize: '0.8rem'
                            }}>
                                <Plus size={14} />
                                Tambah
                            </button>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {/* Header */}
                            <div className="product-row" style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                                <span>NAMA PRODUK</span>
                                <span>QTY</span>
                                <span>HARGA</span>
                                <span>SUBTOTAL</span>
                                <span></span>
                            </div>

                            {formData.products.map((prod, i) => (
                                <div key={i} className="product-row">
                                    <input
                                        type="text"
                                        value={prod.name}
                                        onChange={e => updateProduct(i, 'name', e.target.value)}
                                        placeholder="Nama produk"
                                    />
                                    <input
                                        type="number"
                                        value={prod.qty}
                                        onChange={e => updateProduct(i, 'qty', parseInt(e.target.value) || 0)}
                                        min="0"
                                    />
                                    <input
                                        type="number"
                                        value={prod.unitPrice}
                                        onChange={e => updateProduct(i, 'unitPrice', parseFloat(e.target.value) || 0)}
                                        min="0"
                                    />
                                    <input
                                        type="text"
                                        value={formatRp(prod.subtotal)}
                                        readOnly
                                        style={{ color: 'var(--accent-emerald)', fontWeight: 600 }}
                                    />
                                    {formData.products.length > 1 && (
                                        <button
                                            className="btn-icon"
                                            onClick={() => removeProduct(i)}
                                            style={{ color: 'var(--accent-rose)', padding: 6 }}
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Discount & Total */}
                    <div className="glass-card">
                        <div style={{ display: 'flex', gap: 16, alignItems: 'end', flexWrap: 'wrap', marginBottom: 16 }}>
                            <div className="form-group" style={{ flex: 1, minWidth: 120 }}>
                                <label>Subtotal</label>
                                <input type="text" readOnly
                                    value={formatRp(formData.products.reduce((s, p) => s + (p.subtotal || 0), 0))}
                                    style={{ fontWeight: 600, color: 'var(--text-secondary)' }} />
                            </div>
                            <div className="form-group" style={{ width: 100 }}>
                                <label>Diskon (%)</label>
                                <input type="number" value={formData.discount} min="0" max="100"
                                    onChange={e => updateDiscount(e.target.value)} />
                            </div>
                            {formData.discount > 0 && (
                                <div className="form-group" style={{ flex: 1, minWidth: 120 }}>
                                    <label>Potongan</label>
                                    <input type="text" readOnly
                                        value={`- ${formatRp(Math.round(formData.products.reduce((s, p) => s + (p.subtotal || 0), 0) * formData.discount / 100))}`}
                                        style={{ fontWeight: 600, color: 'var(--accent-rose)' }} />
                                </div>
                            )}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 12, borderTop: '1px solid var(--border-glass)' }}>
                            <div>
                                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>TOTAL</p>
                                <p style={{ fontSize: '1.5rem', fontWeight: 700, background: 'var(--gradient-success)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                                    {formatRp(formData.totalAmount)}
                                </p>
                            </div>
                            <button className="btn btn-success btn-lg" onClick={handleConfirm} disabled={saving}>
                                {saving ? (
                                    <><div className="spinner" style={{ width: 18, height: 18, borderWidth: 2, borderTopColor: 'white' }}></div> Menyimpan...</>
                                ) : (
                                    <><CheckCircle size={18} /> Konfirmasi & Rekap</>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
