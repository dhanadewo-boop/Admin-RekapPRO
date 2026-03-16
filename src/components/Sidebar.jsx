import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
    LayoutDashboard, Zap, FileText, Users, Package,
    Target, LogOut, ChevronLeft, Menu, BarChart2, History, ClipboardList, Settings
} from 'lucide-react';
import { useState } from 'react';

const navItems = [
    { to: '/',               icon: LayoutDashboard, label: 'Dashboard',        roles: ['admin', 'pimpinan', 'marketing'] },
    { to: '/entry',          icon: Zap,             label: 'Quick Entry',       roles: ['admin'] },
    { to: '/rekap',          icon: FileText,        label: 'Rekap Penjualan',   roles: ['admin', 'pimpinan', 'marketing'] },
    { to: '/analitik',       icon: BarChart2,       label: 'Rekap Kontribusi',  roles: ['admin', 'pimpinan', 'marketing'] },
    { to: '/program-target', icon: ClipboardList,   label: 'Program Target',    roles: ['admin', 'pimpinan', 'marketing'] },
    { to: '/customers',      icon: Users,           label: 'Rekap Customer',    roles: ['admin', 'pimpinan', 'marketing'] },
    { to: '/products',       icon: Package,         label: 'Rekap Produk',      roles: ['admin', 'pimpinan', 'marketing'] },
    { to: '/targets',        icon: Target,          label: 'Target Customer',   roles: ['admin', 'pimpinan'] },
    { to: '/history',        icon: History,         label: 'Data Historis',     roles: ['admin', 'pimpinan'] },
    { to: '/settings',       icon: Settings,        label: 'Settings',          roles: ['admin'] },
];

const roleLabels = {
    admin: 'Administrator',
    pimpinan: 'Pimpinan',
    marketing: 'Marketing'
};

const roleColors = {
    admin: 'var(--accent-blue)',
    pimpinan: 'var(--accent-purple)',
    marketing: 'var(--accent-emerald)'
};

export default function Sidebar() {
    const { user, logout } = useAuth();
    const [collapsed, setCollapsed] = useState(false);
    const location = useLocation();

    const filteredItems = navItems.filter(item => item.roles.includes(user?.role));

    return (
        <>
            <button
                className="sidebar-mobile-toggle"
                onClick={() => setCollapsed(!collapsed)}
                style={{
                    position: 'fixed', top: 16, left: 16, zIndex: 1001,
                    display: 'none', padding: 8, background: 'var(--bg-card)',
                    borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-glass)'
                }}
            >
                <Menu size={20} />
            </button>

            <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`} style={{
                position: 'fixed', top: 0, left: 0, bottom: 0,
                width: collapsed ? 'var(--sidebar-collapsed)' : 'var(--sidebar-width)',
                background: '#FFFFFF',
                borderRight: '1px solid var(--border-glass)',
                boxShadow: '2px 0 12px rgba(72, 169, 166, 0.06)',
                display: 'flex', flexDirection: 'column',
                padding: '20px 12px',
                transition: 'width var(--transition-normal)',
                zIndex: 1000,
                overflowX: 'hidden'
            }}>
                <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    marginBottom: 32, padding: '0 4px', minHeight: 40
                }}>
                    {!collapsed && (
                        <div style={{ animation: 'fadeIn 0.3s ease' }}>
                            <h1 style={{
                                fontSize: '1.15rem', fontWeight: 800,
                                background: 'var(--gradient-primary)',
                                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                                backgroundClip: 'text', whiteSpace: 'nowrap'
                            }}>
                                Admin-RekapPRO
                            </h1>
                            <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: 2 }}>
                                Invoice Management System
                            </p>
                        </div>
                    )}
                    <button onClick={() => setCollapsed(!collapsed)} style={{
                        padding: 6, borderRadius: 'var(--radius-sm)',
                        transition: 'background var(--transition-fast)',
                        color: 'var(--text-muted)'
                    }}
                        onMouseEnter={e => e.target.style.background = 'var(--bg-glass-hover)'}
                        onMouseLeave={e => e.target.style.background = 'transparent'}
                    >
                        {collapsed ? <Menu size={18} /> : <ChevronLeft size={18} />}
                    </button>
                </div>

                <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {filteredItems.map(({ to, icon: Icon, label }) => {
                        const isActive = location.pathname === to || (to !== '/' && location.pathname.startsWith(to));
                        return (
                            <NavLink key={to} to={to} style={{
                                display: 'flex', alignItems: 'center', gap: 12,
                                padding: '10px 12px', borderRadius: 'var(--radius-sm)',
                                color: isActive ? 'white' : 'var(--text-secondary)',
                                background: isActive ? 'var(--gradient-primary)' : 'transparent',
                                boxShadow: isActive ? 'var(--shadow-glow-blue)' : 'none',
                                transition: 'all var(--transition-fast)',
                                fontSize: '0.875rem', fontWeight: isActive ? 600 : 400,
                                whiteSpace: 'nowrap', overflow: 'hidden'
                            }}
                                onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'var(--bg-glass-hover)'; }}
                                onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
                            >
                                <Icon size={20} style={{ flexShrink: 0 }} />
                                {!collapsed && <span>{label}</span>}
                            </NavLink>
                        );
                    })}
                </nav>

                <div style={{ borderTop: '1px solid var(--border-glass)', paddingTop: 16, marginTop: 16 }}>
                    {!collapsed && user && (
                        <div style={{ marginBottom: 12, padding: '0 4px' }}>
                            <p style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: 2 }}>
                                {user.name || user.email}
                            </p>
                            <span style={{
                                fontSize: '0.7rem', fontWeight: 600,
                                color: roleColors[user.role] || 'var(--text-muted)',
                                textTransform: 'uppercase', letterSpacing: '0.05em'
                            }}>
                                {roleLabels[user.role] || user.role}
                            </span>
                        </div>
                    )}
                    <button onClick={logout} style={{
                        display: 'flex', alignItems: 'center', gap: 12,
                        padding: '10px 12px', borderRadius: 'var(--radius-sm)',
                        color: 'var(--accent-rose)', width: '100%',
                        transition: 'background var(--transition-fast)',
                        fontSize: '0.875rem', whiteSpace: 'nowrap'
                    }}
                        onMouseEnter={e => e.target.style.background = 'var(--accent-rose-glow)'}
                        onMouseLeave={e => e.target.style.background = 'transparent'}
                    >
                        <LogOut size={20} style={{ flexShrink: 0 }} />
                        {!collapsed && <span>Keluar</span>}
                    </button>
                </div>
            </aside>

            <style>{`
        @media (max-width: 768px) {
          .sidebar-mobile-toggle { display: block !important; }
          .sidebar {
            transform: ${collapsed ? 'translateX(-100%)' : 'translateX(0)'};
            width: var(--sidebar-width) !important;
          }
        }
      `}</style>
        </>
    );
}