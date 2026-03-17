import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { distributeInvoice } from '../lib/distributionEngine';
import { getAllCustomers, getAllProducts } from '../lib/masterData';
import { supabase } from '../lib/supabase';
import IlikeInput from '../components/IlikeInput';
import {
    Plus, Trash2, CheckCircle, AlertCircle,
    FileText, Zap, RotateCcw, X, Lock
} from 'lucide-react';

export default function QuickEntryPage() {
    const navigate = useNavigate();
    const [saving, setSaving] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState('');
    const dateInputRef = useRef(null);
    const shouldFocusNewRow = useRef(false);
    const invoiceNumberRef = useRef(null);
    const customerNameRef = useRef(null);

    // ─── Lock states ───
    const [customerLocked, setCustomerLocked] = useState(false);
    const [invoiceDupWarning, setInvoiceDupWarning] = useState(''); // '' | 'checking' | 'duplicate' | 'ok'
    const dupCheckTimer = useRef(null);

    const [formData, setFormData] = useState({
        customerName: '',
        city: '',
        invoiceNumber: '',
        invoiceDate: '',
        products: [createEmptyProduct()],
        totalAmount: 0
    });

    function createEmptyProduct() {
        return { name: '', qty: 1, unit: 'dus', unitPrice: 0, subtotal: 0, discountPercent: 0, productCode: '', locked: false };
    }

    // ─── Build ILIKE items from master data ───
    const customerItems = getAllCustomers().map(c => ({
        label: c.name,
        sublabel: [c.shortcode, c.area].filter(Boolean).join(' • '),
        value: c
    }));

    const productItems = getAllProducts().map(p => ({
        label: p.name,
        sublabel: [p.shortcode, p.code, `Rp ${p.price.toLocaleString('id-ID')}`]
            .filter(Boolean).join(' • '),
        value: p
    }));

    // ─── Smart Date Auto-Complete ───
    // User types "26-2" + Enter → "26-Feb-2026"
    // User types "3-12" + Enter → "03-Des-2026"
    // User types "15-1" + Enter → "15-Jan-2026"
    const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

    const autoCompleteDate = (raw) => {
        if (!raw) return raw;
        const trimmed = raw.trim();

        // Match "DD-M" or "DD-MM" pattern
        const match = trimmed.match(/^(\d{1,2})-(\d{1,2})$/);
        if (match) {
            const day = match[1].padStart(2, '0');
            const monthNum = parseInt(match[2]);
            if (monthNum >= 1 && monthNum <= 12) {
                const monthName = MONTH_NAMES[monthNum - 1];
                const year = new Date().getFullYear();
                return `${day}-${monthName}-${year}`;
            }
        }

        // Already complete format "DD-Mon-YYYY" — return as-is
        return raw;
    };

    // Validasi tanggal tidak melebihi hari ini
    const validateDate = (dateStr) => {
        if (!dateStr) return null;
        const MONTHS = {Jan:0,Feb:1,Mar:2,Apr:3,Mei:4,May:4,Jun:5,Jul:6,Agu:7,Aug:7,Sep:8,Okt:9,Oct:9,Nov:10,Des:11,Dec:11};
        const parts = dateStr.split('-');
        if (parts.length !== 3) return null;
        const month = MONTHS[parts[1]];
        if (month === undefined) return null;
        const inputDate = new Date(parseInt(parts[2]), month, parseInt(parts[0]));
        const today = new Date(); today.setHours(23, 59, 59, 999);
        if (inputDate > today) {
            return `Tanggal ${dateStr} melebihi hari ini. Harap periksa kembali.`;
        }
        return null;
    };

    const handleDateKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const completed = autoCompleteDate(formData.invoiceDate);
            updateField('invoiceDate', completed);
            const dateErr = validateDate(completed);
            if (dateErr) {
                setError(dateErr);
                updateField('invoiceDate', '');
                return;
            } else if (completed) {
                setError('');
            }

            // Move focus to first product input
            setTimeout(() => {
                const rows = document.querySelectorAll('.product-row');
                if (rows.length > 1) { // Index 0 is header, index 1 is first product
                    const firstProductInput = rows[1].querySelector('input[type="text"]');
                    if (firstProductInput) firstProductInput.focus();
                }
            }, 50);
        }
    };

    // ─── Duplicate Invoice Number Check ───
    const checkDuplicateInvoice = useCallback(async (num) => {
        const trimmed = num.trim();
        if (!trimmed) { setInvoiceDupWarning(''); return; }
        setInvoiceDupWarning('checking');
        clearTimeout(dupCheckTimer.current);
        dupCheckTimer.current = setTimeout(async () => {
            const { data } = await supabase
                .from('invoices')
                .select('id')
                .eq('invoice_number', trimmed)
                .limit(1);
            setInvoiceDupWarning(data && data.length > 0 ? 'duplicate' : 'ok');
        }, 500);
    }, []);

    // ─── Form Handlers ───
    const updateField = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const recalcTotals = (products) => {
        const totalAmount = products.reduce((sum, p) => sum + (p.subtotal || 0), 0);
        return { totalAmount };
    };

    const updateProduct = (index, field, value) => {
        setFormData(prev => {
            const products = [...prev.products];
            products[index] = { ...products[index], [field]: value };

            // When discount changes, propagate to all subsequent products that support the same value
            if (field === 'discountPercent') {
                for (let j = index + 1; j < products.length; j++) {
                    const opts = products[j].discountOptions || [0];
                    if (opts.includes(value) && products[j].name) {
                        products[j] = { ...products[j], discountPercent: value };
                        const qj = products[j].qty || 0;
                        const pj = products[j].unitPrice || 0;
                        const gj = qj * pj;
                        products[j].subtotal = gj - Math.round(gj * value / 100);
                    }
                }
            }

            // Auto-recalc subtotal for the changed row
            if (field === 'qty' || field === 'unitPrice' || field === 'discountPercent') {
                const qty = products[index].qty || 0;
                const price = products[index].unitPrice || 0;
                const disc = products[index].discountPercent || 0;
                const gross = qty * price;
                products[index].subtotal = gross - Math.round(gross * disc / 100);
            }
            const { totalAmount } = recalcTotals(products);
            return { ...prev, products, totalAmount };
        });
    };

    const addProduct = () => {
        setFormData(prev => ({
            ...prev,
            products: [...prev.products, createEmptyProduct()]
        }));
    };

    // Add product + auto-focus new row
    const addProductAndFocus = () => {
        addProduct();
        shouldFocusNewRow.current = true;
    };

    // Auto-focus the last product row's name input when a new row is added
    useEffect(() => {
        if (shouldFocusNewRow.current) {
            shouldFocusNewRow.current = false;
            // Small delay to let React render the new row
            setTimeout(() => {
                const rows = document.querySelectorAll('.product-row');
                const lastRow = rows[rows.length - 1];
                if (lastRow) {
                    const input = lastRow.querySelector('input[type="text"]');
                    if (input) input.focus();
                }
            }, 50);
        }
    }, [formData.products.length]);

    const removeProduct = (index) => {
        setFormData(prev => {
            const products = prev.products.filter((_, i) => i !== index);
            if (products.length === 0) products.push(createEmptyProduct());
            const { totalAmount } = recalcTotals(products);
            return { ...prev, products, totalAmount };
        });
    };

    const resetForm = () => {
        setFormData({
            customerName: '',
            city: '',
            invoiceNumber: '',
            invoiceDate: '',
            products: [createEmptyProduct()],
            totalAmount: 0
        });
        setError('');
        setSuccess(false);
        setCustomerLocked(false);
        setInvoiceDupWarning('');
    };

    const handleConfirm = async () => {
        // Validation
        if (!formData.customerName.trim()) {
            setError('Nama customer harus diisi');
            return;
        }
        if (!formData.invoiceNumber.trim()) {
            setError('Nomor SPB harus diisi');
            return;
        }
        if (!formData.invoiceDate.trim()) {
            setError('Tanggal harus diisi');
            return;
        }
        if (formData.products.length === 0 || !formData.products[0].name) {
            setError('Minimal satu produk harus diisi');
            return;
        }

        setSaving(true);
        setError('');

        try {
            const dataToSave = {
                ...formData,
                customerName: formData.customerName.trim(),  // TRIM sebelum INSERT
                source: 'manual'
            };
            await distributeInvoice(dataToSave, null);
            resetForm();
            setSuccess(true);
            setTimeout(() => setSuccess(false), 3000);
            setTimeout(() => customerNameRef.current?.focus(), 50);
        } catch (err) {
            console.error('Save error:', err);
            setError('Gagal menyimpan data. Silakan coba lagi.');
        } finally {
            setSaving(false);
        }
    };

    const formatRp = (n) => `Rp ${(n || 0).toLocaleString('id-ID')}`;

    // ─── Main Form ───
    return (
        <div className="animate-fade-in">
            <div className="page-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                        width: 40, height: 40, borderRadius: 'var(--radius-sm)',
                        background: 'var(--accent-blue-glow)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                        <Zap size={22} color="var(--accent-blue)" />
                    </div>
                    <div>
                        <h1>Quick Entry</h1>
                        <p>Input invoice langsung — cepat dan akurat</p>
                    </div>
                </div>
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

            {success && (
                <div style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '12px 16px', borderRadius: 'var(--radius-sm)',
                    background: 'var(--accent-emerald-glow)', color: 'var(--accent-emerald)',
                    marginBottom: 16, fontSize: '0.9rem', fontWeight: 500,
                    animation: 'fadeIn 0.3s ease-out'
                }}>
                    <CheckCircle size={18} />
                    Invoice Berhasil Direkap! Siap untuk entry berikutnya.
                </div>
            )}

            <div className="quick-entry-layout">
                {/* Left Column: Form */}
                <div className="quick-entry-form">
                    {/* Invoice Info Card */}
                    <div className="glass-card">
                        <h3 style={{
                            fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)',
                            textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 16,
                            display: 'flex', alignItems: 'center', gap: 6
                        }}>
                            📋 Informasi Invoice
                        </h3>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                            <div className="form-group">
                                <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    Nama Customer
                                    <span style={{ fontWeight: 400, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                        (ketik lalu <kbd className="kbd">↵ Enter</kbd>)
                                    </span>
                                </label>
                                {customerLocked ? (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <div style={{
                                            flex: 1, padding: '9px 12px',
                                            borderRadius: 'var(--radius-sm)',
                                            border: '1.5px solid var(--accent-emerald)',
                                            background: 'var(--accent-emerald-glow)',
                                            fontSize: '0.9rem', fontWeight: 600,
                                            color: 'var(--text-primary)',
                                            display: 'flex', alignItems: 'center', gap: 8
                                        }}>
                                            <Lock size={14} color="var(--accent-emerald)" style={{ flexShrink: 0 }} />
                                            {formData.customerName}
                                        </div>
                                        <button
                                            onClick={() => {
                                                setCustomerLocked(false);
                                                updateField('customerName', '');
                                                updateField('city', '');
                                                setTimeout(() => customerNameRef.current?.focus(), 50);
                                            }}
                                            title="Reset customer"
                                            style={{
                                                padding: '8px 10px', borderRadius: 'var(--radius-sm)',
                                                border: '1px solid var(--border-glass)', background: 'white',
                                                color: 'var(--accent-rose)', cursor: 'pointer', flexShrink: 0
                                            }}
                                        >
                                            <X size={16} />
                                        </button>
                                    </div>
                                ) : (
                                    <IlikeInput
                                        inputRef={customerNameRef}
                                        value={formData.customerName}
                                        onChange={val => updateField('customerName', val)}
                                        items={customerItems}
                                        onSelect={item => {
                                            updateField('customerName', item.value.name);
                                            if (item.value.area) updateField('city', item.value.area);
                                            setCustomerLocked(true);
                                            setTimeout(() => invoiceNumberRef.current?.focus(), 50);
                                        }}
                                        placeholder="Ketik singkatan (TSM) atau nama..."
                                    />
                                )}
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                                <div className="form-group">
                                    <label>Kota / Area</label>
                                    <input
                                        type="text"
                                        value={formData.city}
                                        readOnly
                                        tabIndex={-1}
                                        style={{
                                            color: 'var(--text-secondary)',
                                            fontWeight: 500,
                                            fontStyle: 'italic',
                                            background: 'var(--bg-glass)',
                                            pointerEvents: 'none',
                                            userSelect: 'none'
                                        }}
                                        placeholder="Area..."
                                    />
                                </div>
                                <div className="form-group">
                                    <label>No. SPB</label>
                                    <input
                                        ref={invoiceNumberRef}
                                        type="text"
                                        value={formData.invoiceNumber}
                                        onChange={e => {
                                            updateField('invoiceNumber', e.target.value);
                                            checkDuplicateInvoice(e.target.value);
                                        }}
                                        placeholder="024285"
                                        style={{
                                            borderColor: invoiceDupWarning === 'duplicate'
                                                ? 'var(--accent-amber)'
                                                : invoiceDupWarning === 'ok'
                                                ? 'var(--accent-emerald)'
                                                : undefined
                                        }}
                                    />
                                    {invoiceDupWarning === 'duplicate' && (
                                        <div style={{
                                            marginTop: 4, fontSize: '0.78rem', fontWeight: 600,
                                            color: '#92610a', background: 'rgba(242,153,74,0.15)',
                                            border: '1px solid rgba(242,153,74,0.4)',
                                            borderRadius: 'var(--radius-sm)', padding: '5px 10px',
                                            display: 'flex', alignItems: 'center', gap: 6
                                        }}>
                                            <AlertCircle size={13} /> No. SPB ini sudah ada — pastikan bukan duplikasi
                                        </div>
                                    )}
                                    {invoiceDupWarning === 'checking' && (
                                        <div style={{ marginTop: 4, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                            Mengecek...
                                        </div>
                                    )}
                                </div>
                                <div className="form-group">
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        Tanggal
                                        <span style={{ fontWeight: 400, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                            (cth: 26-2 <kbd className="kbd">↵ Enter</kbd>)
                                        </span>
                                    </label>
                                    <input
                                        ref={dateInputRef}
                                        type="text"
                                        value={formData.invoiceDate}
                                        onChange={e => updateField('invoiceDate', e.target.value)}
                                        onKeyDown={handleDateKeyDown}
                                        onBlur={() => {
                                            const completed = autoCompleteDate(formData.invoiceDate);
                                            updateField('invoiceDate', completed);
                                            const dateErr = validateDate(completed);
                                            if (dateErr) { setError(dateErr); updateField('invoiceDate', ''); }
                                            else if (completed) setError('');
                                        }}
                                        placeholder="26-2 → Enter"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Products Card */}
                    <div className="glass-card">
                        <div style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            marginBottom: 20, flexWrap: 'wrap', gap: '12px'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                                <h3 style={{
                                    fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)',
                                    textTransform: 'uppercase', letterSpacing: '0.05em',
                                    display: 'flex', alignItems: 'center', gap: 6, margin: 0
                                }}>
                                    📦 Daftar Produk
                                </h3>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'var(--bg-glass)', padding: '6px 12px', borderRadius: 'var(--radius-sm)' }}>
                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}><kbd className="kbd">↵ Enter</kbd> Pilih Data</span>
                                    <span style={{ color: 'var(--border-glass)' }}>|</span>
                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}><kbd className="kbd">⇧ Shift</kbd> + <kbd className="kbd">↵ Enter</kbd> Baris Baru</span>
                                </div>
                            </div>
                            <button className="btn btn-secondary" onClick={addProduct} style={{
                                padding: '6px 16px', fontSize: '0.8rem'
                            }}>
                                <Plus size={14} /> Tambah Baris
                            </button>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {/* Header */}
                            <div className="product-row" style={{
                                fontSize: '0.75rem', color: 'var(--text-primary)', fontWeight: 700,
                                paddingBottom: '8px', borderBottom: '1px solid var(--border-glass)', marginBottom: '8px'
                            }}>
                                <span>NAMA PRODUK</span>
                                <span>QTY</span>
                                <span>HARGA</span>
                                <span>DISC %</span>
                                <span>SUBTOTAL</span>
                                <span></span>
                            </div>

                            {formData.products.map((prod, i) => (
                                <div key={i} className="product-row" style={{
                                    animation: 'fadeIn 0.2s ease',
                                    marginBottom: '4px'
                                }}>
                                    <IlikeInput
                                        value={prod.name}
                                        onChange={val => updateProduct(i, 'name', val)}
                                        items={productItems}
                                        readOnly={prod.locked}
                                        onSelect={item => {
                                            const products = [...formData.products];
                                            const qty = products[i].qty || 1;
                                            const disc = item.value.defaultDiscount || 0;
                                            const gross = qty * item.value.price;
                                            products[i] = {
                                                ...products[i],
                                                name: item.value.name,
                                                unitPrice: item.value.price,
                                                unit: item.value.unit || 'dus',
                                                discountPercent: disc,
                                                discountOptions: item.value.discountOptions || [0],
                                                subtotal: gross - Math.round(gross * disc / 100),
                                                productCode: item.value.code || '',
                                                locked: true
                                            };
                                            const { totalAmount } = recalcTotals(products);
                                            setFormData(prev => ({ ...prev, products, totalAmount }));
                                        }}
                                        onShiftEnter={addProductAndFocus}
                                        placeholder="Ketik singkatan (B100) atau nama..."
                                        lockedDisplay={prod.locked ? (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                <div style={{
                                                    flex: 1, padding: '7px 10px',
                                                    borderRadius: 'var(--radius-sm)',
                                                    border: '1.5px solid var(--accent-emerald)',
                                                    background: 'var(--accent-emerald-glow)',
                                                    fontSize: '0.85rem', fontWeight: 600,
                                                    display: 'flex', alignItems: 'center', gap: 6,
                                                    color: 'var(--text-primary)',
                                                }}>
                                                    <Lock size={12} color="var(--accent-emerald)" style={{ flexShrink: 0 }} />
                                                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                        {prod.name}
                                                    </span>
                                                </div>
                                                <button
                                                    onClick={() => updateProduct(i, 'locked', false)}
                                                    title="Reset produk"
                                                    style={{
                                                        padding: '6px 8px', borderRadius: 'var(--radius-sm)',
                                                        border: '1px solid var(--border-glass)', background: 'white',
                                                        color: 'var(--accent-rose)', cursor: 'pointer', flexShrink: 0
                                                    }}
                                                >
                                                    <X size={13} />
                                                </button>
                                            </div>
                                        ) : null}
                                    />
                                    <input
                                        type="number"
                                        className="no-spin"
                                        value={prod.qty}
                                        onChange={e => updateProduct(i, 'qty', parseInt(e.target.value) || 0)}
                                        onKeyDown={e => {
                                            if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
                                                e.preventDefault();
                                            }
                                            if (e.key === 'Enter' && e.shiftKey) {
                                                e.preventDefault();
                                                addProductAndFocus();
                                            }
                                        }}
                                        min="0"
                                        style={{ fontWeight: 600, color: 'var(--text-primary)' }}
                                    />
                                    <input
                                        type="text"
                                        value={formatRp(prod.unitPrice)}
                                        readOnly
                                        tabIndex={-1}
                                        style={{
                                            color: 'var(--text-secondary)',
                                            fontWeight: 500,
                                            fontStyle: 'italic',
                                            background: 'var(--bg-glass)',
                                            pointerEvents: 'none',
                                            userSelect: 'none'
                                        }}
                                    />
                                    {(prod.discountOptions && prod.discountOptions.length > 1) ? (
                                        <select
                                            value={prod.discountPercent || 0}
                                            onChange={e => updateProduct(i, 'discountPercent', parseInt(e.target.value) || 0)}
                                            onKeyDown={e => {
                                                if (e.key === 'Enter' && e.shiftKey) {
                                                    e.preventDefault();
                                                    addProductAndFocus();
                                                }
                                            }}
                                            style={{ textAlign: 'center', cursor: 'pointer' }}
                                        >
                                            {prod.discountOptions.map(opt => (
                                                <option key={opt} value={opt}>{opt}%</option>
                                            ))}
                                        </select>
                                    ) : (
                                        <input
                                            type="text"
                                            value={`${prod.discountPercent || 0}%`}
                                            readOnly
                                            onKeyDown={e => {
                                                if (e.key === 'Enter' && e.shiftKey) {
                                                    e.preventDefault();
                                                    addProductAndFocus();
                                                }
                                            }}
                                            style={{ textAlign: 'center', color: 'var(--text-muted)', background: 'var(--bg-glass)' }}
                                        />
                                    )}
                                    <input
                                        type="text"
                                        value={formatRp(prod.subtotal)}
                                        readOnly
                                        style={{ color: 'var(--accent-emerald)', fontWeight: 600 }}
                                    />
                                    <button
                                        className="btn-icon"
                                        onClick={() => removeProduct(i)}
                                        style={{ color: 'var(--accent-rose)', padding: 6 }}
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Totals & Submit */}
                    <div className="glass-card">
                        <div style={{ display: 'flex', gap: 16, alignItems: 'end', flexWrap: 'wrap', marginBottom: 16 }}>
                            <div className="form-group" style={{ flex: 1, minWidth: 120 }}>
                                <label>Subtotal (sebelum diskon)</label>
                                <input type="text" readOnly
                                    value={formatRp(formData.products.reduce((s, p) => {
                                        return s + ((p.qty || 0) * (p.unitPrice || 0));
                                    }, 0))}
                                    style={{ fontWeight: 600, color: 'var(--text-secondary)' }} />
                            </div>
                            {formData.products.some(p => (p.discountPercent || 0) > 0) && (
                                <div className="form-group" style={{ flex: 1, minWidth: 120 }}>
                                    <label>Total Potongan</label>
                                    <input type="text" readOnly
                                        value={`- ${formatRp(formData.products.reduce((s, p) => {
                                            const gross = (p.qty || 0) * (p.unitPrice || 0);
                                            return s + Math.round(gross * (p.discountPercent || 0) / 100);
                                        }, 0))}`}
                                        style={{ fontWeight: 600, color: 'var(--accent-rose)' }} />
                                </div>
                            )}
                        </div>
                        <div style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            paddingTop: 12, borderTop: '1px solid var(--border-glass)'
                        }}>
                            <div>
                                <p style={{
                                    fontSize: '0.8rem', color: 'var(--text-muted)',
                                    fontWeight: 600, textTransform: 'uppercase'
                                }}>TOTAL</p>
                                <p style={{
                                    fontSize: '1.5rem', fontWeight: 700,
                                    background: 'var(--gradient-success)',
                                    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                                    backgroundClip: 'text'
                                }}>
                                    {formatRp(formData.totalAmount)}
                                </p>
                            </div>
                            <div style={{ display: 'flex', gap: 8 }}>
                                <button className="btn btn-secondary" onClick={resetForm} title="Reset Form">
                                    <RotateCcw size={16} /> Reset
                                </button>
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
        </div >
    );
}