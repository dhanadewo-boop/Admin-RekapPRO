import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import { extractText, parseInvoiceText, pdfToImages } from '../lib/ocrEngine';
import { Upload, ScanLine, Image as ImageIcon, AlertCircle, FileText } from 'lucide-react';

export default function ScanPage() {
    const [imageFile, setImageFile] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
    const [processing, setProcessing] = useState(false);
    const [progress, setProgress] = useState(0);
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const onDrop = useCallback((files) => {
        if (files.length > 0) {
            const file = files[0];
            setImageFile(file);
            // For PDFs, don't create an object URL preview (we'll show an icon instead)
            if (file.type === 'application/pdf' || file.name?.toLowerCase().endsWith('.pdf')) {
                setImagePreview('pdf');
            } else {
                setImagePreview(URL.createObjectURL(file));
            }
            setError('');
        }
    }, []);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            'image/*': ['.png', '.jpg', '.jpeg', '.webp', '.bmp'],
            'application/pdf': ['.pdf']
        },
        maxFiles: 1,
        maxSize: 20 * 1024 * 1024 // 20MB for PDFs
    });

    const handleProcess = async () => {
        if (!imageFile) return;
        setProcessing(true);
        setProgress(0);
        setError('');

        try {
            const rawText = await extractText(imageFile, setProgress);
            const parsed = parseInvoiceText(rawText);

            // Store data in sessionStorage for the validate page
            sessionStorage.setItem('ocrResult', JSON.stringify(parsed));

            // For PDFs, generate a first-page preview image
            let previewUrl = imagePreview;
            if (imagePreview === 'pdf') {
                const pageImages = await pdfToImages(imageFile);
                if (pageImages.length > 0) {
                    previewUrl = URL.createObjectURL(pageImages[0]);
                }
            }
            sessionStorage.setItem('ocrImage', previewUrl);

            // Store the actual file for upload later
            const reader = new FileReader();
            reader.onload = () => {
                sessionStorage.setItem('ocrImageData', reader.result);
                navigate('/validate/new');
            };
            reader.readAsDataURL(imageFile);
        } catch (err) {
            console.error('OCR Error:', err);
            setError('Gagal memproses gambar. Pastikan gambar berkualitas baik dan coba lagi.');
            setProcessing(false);
        }
    };

    const removeImage = () => {
        setImageFile(null);
        setImagePreview(null);
        setError('');
    };

    return (
        <div className="animate-fade-in">
            <div className="page-header">
                <h1>Scan Invoice</h1>
                <p>Unggah foto invoice fisik untuk diekstrak secara otomatis dengan AI OCR</p>
            </div>

            {/* Processing State */}
            {processing ? (
                <div className="glass-card">
                    <div className="ocr-progress">
                        <div style={{
                            width: 80, height: 80, borderRadius: 'var(--radius-lg)',
                            background: 'var(--accent-blue-glow)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}>
                            <ScanLine size={36} color="var(--accent-blue)" style={{
                                animation: 'pulse 1.5s ease-in-out infinite'
                            }} />
                        </div>
                        <h2 style={{ fontSize: '1.2rem', fontWeight: 600 }}>Memproses Invoice...</h2>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                            AI sedang membaca dan mengekstrak data dari gambar
                        </p>
                        <div className="ocr-progress-bar">
                            <div className="ocr-progress-fill" style={{ width: `${progress}%` }} />
                        </div>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{progress}%</p>
                    </div>
                </div>
            ) : (
                <>
                    {/* Error */}
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

                    {/* Dropzone or Preview */}
                    {!imagePreview ? (
                        <div {...getRootProps()} className={`dropzone ${isDragActive ? 'active' : ''}`}>
                            <input {...getInputProps()} />
                            <div className="dropzone-content">
                                <Upload />
                                <h3>
                                    {isDragActive ? 'Lepaskan gambar di sini...' : 'Seret & lepas foto invoice'}
                                </h3>
                                <p>atau klik untuk memilih file (PNG, JPG, WEBP, PDF • Maks 20MB)</p>
                            </div>
                        </div>
                    ) : (
                        <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
                            {/* Image or PDF Preview */}
                            {imagePreview === 'pdf' ? (
                                <div style={{
                                    display: 'flex', flexDirection: 'column',
                                    alignItems: 'center', justifyContent: 'center',
                                    padding: '48px 24px', gap: 12
                                }}>
                                    <FileText size={64} color="var(--accent-blue)" />
                                    <p style={{ fontSize: '1rem', fontWeight: 600 }}>
                                        {imageFile?.name}
                                    </p>
                                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                        PDF akan dikonversi ke gambar lalu di-OCR
                                    </p>
                                </div>
                            ) : (
                                <div className="image-preview" style={{ maxHeight: 500 }}>
                                    <img src={imagePreview} alt="Invoice preview" />
                                </div>
                            )}

                            {/* Action Bar */}
                            <div style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                padding: '16px 20px', borderTop: '1px solid var(--border-glass)'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <ImageIcon size={16} color="var(--text-muted)" />
                                    <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                        {imageFile?.name}
                                    </span>
                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                        ({(imageFile?.size / 1024 / 1024).toFixed(1)} MB)
                                    </span>
                                </div>
                                <div style={{ display: 'flex', gap: 8 }}>
                                    <button className="btn btn-secondary" onClick={removeImage}>
                                        Ganti Gambar
                                    </button>
                                    <button className="btn btn-primary" onClick={handleProcess}>
                                        <ScanLine size={16} />
                                        Proses OCR
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Instructions */}
                    <div className="glass-card" style={{ marginTop: 16 }}>
                        <h3 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: 12 }}>
                            💡 Tips untuk Hasil OCR Terbaik
                        </h3>
                        <ul style={{
                            listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8,
                            fontSize: '0.85rem', color: 'var(--text-secondary)'
                        }}>
                            <li>✅ Pastikan gambar terang dan tidak buram</li>
                            <li>✅ Foto secara lurus (tidak miring)</li>
                            <li>✅ Pastikan semua teks terlihat jelas</li>
                            <li>✅ Hindari bayangan menutupi tulisan</li>
                        </ul>
                    </div>
                </>
            )}
        </div>
    );
}
