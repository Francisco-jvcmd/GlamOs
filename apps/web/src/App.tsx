import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './auth/auth-context';
import { ProtectedRoute } from './auth/ProtectedRoute';
import { AppLayout } from './layouts/AppLayout';

import { LoginPage } from './pages/LoginPage';
import { OnboardingPage } from './pages/OnboardingPage';
import { DashboardPage } from './pages/DashboardPage';
import { SalesPage } from './pages/SalesPage';
import { NewSalePage } from './pages/NewSalePage';
import { ServicesPage } from './pages/ServicesPage';
import { InventoryPage } from './pages/InventoryPage';
import { FinancePage } from './pages/FinancePage';
import { ClientsPage } from './pages/ClientsPage';
import { SettingsPage } from './pages/SettingsPage';

function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/onboarding" element={<OnboardingPage />} />
        
        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/sales" element={<SalesPage />} />
            <Route path="/sales/new" element={<NewSalePage />} />
            <Route path="/services" element={<ServicesPage />} />
            <Route path="/clients" element={<ClientsPage />} />
            <Route path="/settings" element={<SettingsPage />} />

            {/* Rutas Exclusivas de Administrador (Finanzas e Inventario) */}
            <Route element={<ProtectedRoute requiredRole="OWNER_ADMIN" />}>
              <Route path="/inventory" element={<InventoryPage />} />
              <Route path="/finance" element={<FinancePage />} />
            </Route>
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
}

export default App;
