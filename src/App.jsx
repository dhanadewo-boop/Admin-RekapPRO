import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Sidebar from './components/Sidebar';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import QuickEntryPage from './pages/QuickEntryPage';
import InvoicesPage from './pages/InvoicesPage';
import RekapPage from './pages/RekapPage';
import CustomersPage from './pages/CustomersPage';
import ProductsPage from './pages/ProductsPage';
import TargetsPage from './pages/TargetsPage';
import RekapTarget from './pages/RekapTarget';

function AppLayout() {
    const { user, loading } = useAuth();

    if (loading) {
        return (
            <div className="loading-overlay" style={{ minHeight: '100vh' }}>
                <div className="spinner spinner-lg"></div>
                <p>Memuat Admin-RekapPRO...</p>
            </div>
        );
    }

    if (!user) {
        return <LoginPage />;
    }

    return (
        <div className="app-layout">
            <Sidebar />
            <main className="main-content">
                <Routes>
                    <Route path="/" element={<DashboardPage />} />

                    {/* Halaman Analitik Baru */}
                    <Route path="/analitik" element={<RekapTarget />} />

                    <Route path="/entry" element={
                        <ProtectedRoute allowedRoles={['admin']}><QuickEntryPage /></ProtectedRoute>
                    } />
                    <Route path="/invoices" element={<InvoicesPage />} />
                    <Route path="/rekap" element={<RekapPage />} />
                    <Route path="/customers" element={<CustomersPage />} />
                    <Route path="/products" element={<ProductsPage />} />
                    <Route path="/targets" element={
                        <ProtectedRoute allowedRoles={['admin', 'pimpinan']}><TargetsPage /></ProtectedRoute>
                    } />
                    <Route path="/scan" element={<Navigate to="/entry" replace />} />
                    <Route path="/validate/*" element={<Navigate to="/entry" replace />} />
                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
            </main>
        </div>
    );
}

export default function App() {
    return (
        <BrowserRouter>
            <AuthProvider>
                <AppLayout />
            </AuthProvider>
        </BrowserRouter>
    );
}