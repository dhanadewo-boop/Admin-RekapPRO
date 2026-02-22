import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { LogIn, Eye, EyeOff } from 'lucide-react';

export default function LoginPage() {
    const { loginUser } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await loginUser(email, password);
            // user state is set in AuthContext → App.jsx re-renders to Dashboard
        } catch (err) {
            const msg = err?.message || 'Gagal login';
            if (msg.includes('Invalid login')) {
                setError('Email atau password salah.');
            } else if (msg.includes('Email not confirmed')) {
                setError('Email belum dikonfirmasi.');
            } else {
                setError(msg);
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-page">
            <div className="login-card glass-card animate-fade-in">
                <div style={{ marginBottom: 8 }}>
                    <div style={{
                        width: 64, height: 64, margin: '0 auto 16px',
                        background: 'var(--gradient-primary)', borderRadius: 'var(--radius-lg)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: 'var(--shadow-glow-blue)'
                    }}>
                        <LogIn size={28} color="white" />
                    </div>
                    <h1 className="logo">Admin-RekapPRO</h1>
                    <p className="subtitle">Masuk ke akun Anda untuk melanjutkan</p>
                </div>

                {error && <div className="login-error">{error}</div>}

                <form className="login-form" onSubmit={handleSubmit}>
                    <label>Email</label>
                    <input
                        type="email" placeholder="nama@perusahaan.com"
                        value={email} onChange={e => setEmail(e.target.value)}
                        required autoFocus
                    />

                    <label>Password</label>
                    <div style={{ position: 'relative' }}>
                        <input
                            type={showPassword ? 'text' : 'password'}
                            placeholder="Masukkan password"
                            value={password} onChange={e => setPassword(e.target.value)}
                            required style={{ paddingRight: 44 }}
                        />
                        <button type="button" onClick={() => setShowPassword(!showPassword)}
                            style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', padding: 4, color: 'var(--text-muted)' }}>
                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                    </div>

                    <button type="submit" className="btn btn-primary btn-lg" disabled={loading}
                        style={{ marginTop: 8, width: '100%' }}>
                        {loading ? (
                            <><div className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }}></div> Memproses...</>
                        ) : (
                            <><LogIn size={18} /> Masuk</>
                        )}
                    </button>
                </form>

                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 24, textAlign: 'center' }}>
                    © 2026 Admin-RekapPRO. All rights reserved.
                </p>
            </div>
        </div>
    );
}
