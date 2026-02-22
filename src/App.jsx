import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Sidebar from './components/Sidebar';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import ScanPage from './pages/ScanPage';
import ValidatePage from './pages/ValidatePage';
import InvoicesPage from './pages/InvoicesPage';
import CustomersPage from './pages/CustomersPage';
import ProductsPage from './pages/ProductsPage';
import TargetsPage from './pages/TargetsPage';

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
                    <Route path="/scan" element={
                        <ProtectedRoute allowedRoles={['admin']}><ScanPage /></ProtectedRoute>
                    } />
                    <Route path="/validate/:id" element={
                        <ProtectedRoute allowedRoles={['admin']}><ValidatePage /></ProtectedRoute>
                    } />
                    <Route path="/invoices" element={<InvoicesPage />} />
                    <Route path="/customers" element={<CustomersPage />} />
                    <Route path="/products" element={<ProductsPage />} />
                    <Route path="/targets" element={
                        <ProtectedRoute allowedRoles={['admin', 'pimpinan']}><TargetsPage /></ProtectedRoute>
                    } />
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
