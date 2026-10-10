import React, { useState } from 'react';
import { Sidebar, ActivePage } from './Sidebar';
import { Header } from './Header';

interface MainLayoutProps {
  children: (activePage: ActivePage, onNavigate: (page: ActivePage) => void) => React.ReactNode;
}

export const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const [activePage, setActivePage] = useState<ActivePage>('dashboard');

  const pageTitles: Record<ActivePage, string> = {
    dashboard: 'Panel de Control & Analítica',
    'monitoring-hub': 'Auditoría RRSS, Conectores & Fiscalización de Actividad',
    employees: 'Directorio de Funcionarios & Estructura',
    publications: 'Publicaciones Institucionales & Campañas',
    interactions: 'Control de Reacciones & Verificación de Funcionarios',
    reports: 'Generación & Custodia de Reportes Oficiales',
    audit: 'Pistas de Auditoría Inmutable (Principio X)',
    admin: 'Administración del Sistema & Conectores',
    matrix: 'Matriz General de Actividad & Cumplimiento',
    analytics: 'Analítica de Reacciones & Fiscalización Interactiva',
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-primary)' }}>
      <Sidebar activePage={activePage} onSelectPage={setActivePage} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflowX: 'hidden' }}>
        <Header title={pageTitles[activePage]} />
        <main style={{ flex: 1, padding: '28px 32px', maxWidth: '1440px', width: '100%', margin: '0 auto' }}>
          {children(activePage, setActivePage)}
        </main>
      </div>
    </div>
  );
};
