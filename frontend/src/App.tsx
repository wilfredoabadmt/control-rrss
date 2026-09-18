import React from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LoginPage } from './pages/LoginPage';
import { MainLayout } from './components/MainLayout';
import { ActivePage } from './components/Sidebar';
import { DashboardPage } from './pages/DashboardPage';
import { EmployeesPage } from './pages/EmployeesPage';
import { PublicationsPage } from './pages/PublicationsPage';
import { InteractionsPage } from './pages/InteractionsPage';
import { ReportsPage } from './pages/ReportsPage';
import { AuditPage } from './pages/AuditPage';
import { AdminPage } from './pages/AdminPage';
import { Activity } from 'lucide-react';

const AppContent: React.FC = () => {
  const { isAuthenticated, isLoading, logout } = useAuth();

  if (isLoading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--bg-primary)',
          color: 'var(--text-muted)',
          gap: '16px',
        }}
      >
        <Activity size={36} color="#06b6d4" className="animate-spin" />
        <span style={{ fontSize: '0.9rem' }}>Cargando GAMEA Social Monitor...</span>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  return (
    <MainLayout>
      {(activePage: ActivePage) => {
        switch (activePage) {
          case 'dashboard':
            return <DashboardPage onLogout={logout} />;
          case 'employees':
            return <EmployeesPage />;
          case 'publications':
            return <PublicationsPage />;
          case 'interactions':
            return <InteractionsPage />;
          case 'reports':
            return <ReportsPage />;
          case 'audit':
            return <AuditPage />;
          case 'admin':
            return <AdminPage />;
          default:
            return <DashboardPage onLogout={logout} />;
        }
      }}
    </MainLayout>
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

export default App;
