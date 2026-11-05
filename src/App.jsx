import { lazy, Suspense } from 'react';
import { Toaster } from "@/components/ui/toaster"
import { ThemeProvider } from 'next-themes'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import ScrollToTop from './components/ScrollToTop';
import ProtectedRoute from '@/components/ProtectedRoute';
import AppLayout from '@/components/layout/AppLayout';
import ErrorBoundary from '@/components/ErrorBoundary';

// Páginas carregadas sob demanda: o pacote inicial fica menor (importante na WebView do app).
// Auth pages
const Login = lazy(() => import('@/pages/Login'));
const Register = lazy(() => import('@/pages/Register'));
const ForgotPassword = lazy(() => import('@/pages/ForgotPassword'));
const ResetPassword = lazy(() => import('@/pages/ResetPassword'));
const OAuthConsent = lazy(() => import('@/pages/OAuthConsent'));

// App pages
const Indicadores = lazy(() => import('@/pages/Indicadores'));
const Equipment = lazy(() => import('@/pages/Equipment'));
const ServiceOrders = lazy(() => import('@/pages/ServiceOrders'));
const Maintenance = lazy(() => import('@/pages/Maintenance'));
const Contracts = lazy(() => import('@/pages/Contracts'));
const SpareParts = lazy(() => import('@/pages/SpareParts'));
const Users = lazy(() => import('@/pages/Users'));
const Settings = lazy(() => import('@/pages/Settings'));
const Auditoria = lazy(() => import('@/pages/Auditoria'));
const MeuPerfil = lazy(() => import('@/pages/MeuPerfil'));

/** Tela cheia usada enquanto uma página ainda está sendo carregada. */
const CarregandoTela = () => (
  <div className="fixed inset-0 flex items-center justify-center">
    <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin"></div>
  </div>
);

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  if (isLoadingPublicSettings || isLoadingAuth) {
    return <CarregandoTela />;
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
    <Suspense fallback={<CarregandoTela />}>
      <Routes>
        {/* Public auth routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        {/* Consentimento de acesso via MCP: precisa ficar fora de qualquer guarda de autenticação */}
        <Route path="/oauth/consent" element={<OAuthConsent />} />

        {/* Protected app routes */}
        <Route element={<ProtectedRoute unauthenticatedElement={<Navigate to="/login" replace />} />}>
          {/* Equipe Técnica foi fundida em Usuários */}
          <Route path="/equipe" element={<Navigate to="/usuarios" replace />} />
          <Route path="/indicadores" element={<Navigate to="/" replace />} />
          <Route element={<AppLayout />}>
            <Route path="/" element={<Indicadores />} />
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
            <Route path="/configuracoes" element={<Settings />} />
          </Route>
        </Route>

        <Route path="*" element={<PageNotFound />} />
      </Routes>
    </Suspense>
  );
};

function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <AuthProvider>
        <QueryClientProvider client={queryClientInstance}>
          <Router>
            <ScrollToTop />
            <ErrorBoundary>
              <AuthenticatedApp />
            </ErrorBoundary>
          </Router>
          <Toaster />
        </QueryClientProvider>
      </AuthProvider>
    </ThemeProvider>
  )
}

export default App