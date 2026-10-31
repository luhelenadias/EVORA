import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import ScrollToTop from './components/ScrollToTop';
import ProtectedRoute from '@/components/ProtectedRoute';

// Auth pages
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import ForgotPassword from '@/pages/ForgotPassword';
import ResetPassword from '@/pages/ResetPassword';

// App pages
import AppLayout from '@/components/layout/AppLayout';
import Dashboard from '@/pages/Dashboard';
import Equipment from '@/pages/Equipment';
import ServiceOrders from '@/pages/ServiceOrders';
import Maintenance from '@/pages/Maintenance';
import Contracts from '@/pages/Contracts';
import SpareParts from '@/pages/SpareParts';
import Users from '@/pages/Users';
import Indicators from '@/pages/Indicators';
import Settings from '@/pages/Settings';
import Auditoria from '@/pages/Auditoria';
import MeuPerfil from '@/pages/MeuPerfil';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin"></div>
      </div>
    );
  }

  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      navigateToLogin();
      return null;
    }
  }

  return (
    <Routes>
      {/* Public auth routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />

      {/* Protected app routes */}
      <Route element={<ProtectedRoute unauthenticatedElement={<Navigate to="/login" replace />} />}>
        {/* Equipe Técnica foi fundida em Usuários */}
        <Route path="/equipe" element={<Navigate to="/usuarios" replace />} />
        <Route element={<AppLayout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/equipamentos" element={<Equipment />} />
          <Route path="/equipamentos/:id" element={<Equipment />} />
          <Route path="/chamados" element={<ServiceOrders />} />
          <Route path="/chamados/novo" element={<Navigate to="/chamados" replace />} />
          <Route path="/manutencoes" element={<Maintenance />} />
          <Route path="/contratos" element={<Contracts />} />

          <Route path="/pecas" element={<SpareParts />} />
          <Route path="/usuarios" element={<Users />} />
          <Route path="/meu-perfil" element={<MeuPerfil />} />
          <Route path="/auditoria" element={<Auditoria />} />
          <Route path="/indicadores" element={<Indicators />} />
          <Route path="/configuracoes" element={<Settings />} />
        </Route>
      </Route>

      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <ScrollToTop />
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App