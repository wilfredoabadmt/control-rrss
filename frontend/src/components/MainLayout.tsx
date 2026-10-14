import React, { useState, useEffect } from 'react';
import { Sidebar, ActivePage } from './Sidebar';
import { Header } from './Header';
import { Activity, Zap, Users, TableProperties, Menu } from 'lucide-react';

interface MainLayoutProps {
  children: (activePage: ActivePage, onNavigate: (page: ActivePage) => void) => React.ReactNode;
}

export const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const [activePage, setActivePage] = useState<ActivePage>('dashboard');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState<boolean>(false);

  // Cerrar el drawer móvil si el usuario redimensiona a pantalla de escritorio
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setIsMobileSidebarOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const pageTitles: Record<ActivePage, string> = {
    dashboard: 'Panel de Control & Analítica',
    'monitoring-hub': 'Auditoría RRSS, Conectores & Fiscalización',
    employees: 'Directorio de Funcionarios & Estructura',
    publications: 'Publicaciones Institucionales & Campañas',
    interactions: 'Control de Reacciones & Verificación',
    reports: 'Generación & Custodia de Reportes Oficiales',
    audit: 'Pistas de Auditoría Inmutable (Principio X)',
    admin: 'Administración del Sistema & Conectores',
    matrix: 'Matriz General de Actividad & Cumplimiento',
    analytics: 'Analítica de Reacciones & Fiscalización Interactiva',
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-primary)' }}>
      {/* Sidebar / Drawer Móvil */}
      <Sidebar
        activePage={activePage}
        onSelectPage={setActivePage}
        isOpen={isMobileSidebarOpen}
        onClose={() => setIsMobileSidebarOpen(false)}
      />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflowX: 'hidden' }}>
        <Header
          title={pageTitles[activePage]}
          onToggleSidebar={() => setIsMobileSidebarOpen((prev) => !prev)}
        />
        <main className="main-content-layout">
          {children(activePage, setActivePage)}
        </main>
      </div>

      {/* Barra de navegación inferior móvil exclusiva para celulares (< 768px) */}
      <nav className="mobile-bottom-nav">
        <button
          className={`mobile-bottom-nav-item ${activePage === 'dashboard' ? 'active' : ''}`}
          onClick={() => setActivePage('dashboard')}
          title="Panel Principal"
        >
          <Activity size={18} />
          <span>Panel</span>
        </button>

        <button
          className={`mobile-bottom-nav-item ${activePage === 'monitoring-hub' ? 'active' : ''}`}
          onClick={() => setActivePage('monitoring-hub')}
          title="Auditoría RRSS"
        >
          <Zap size={18} />
          <span>Auditoría</span>
        </button>

        <button
          className={`mobile-bottom-nav-item ${activePage === 'employees' ? 'active' : ''}`}
          onClick={() => setActivePage('employees')}
          title="Directorio de Funcionarios"
        >
          <Users size={18} />
          <span>Personal</span>
        </button>

        <button
          className={`mobile-bottom-nav-item ${activePage === 'matrix' ? 'active' : ''}`}
          onClick={() => setActivePage('matrix')}
          title="Matriz de Cumplimiento"
        >
          <TableProperties size={18} />
          <span>Matriz</span>
        </button>

        <button
          className="mobile-bottom-nav-item"
          onClick={() => setIsMobileSidebarOpen(true)}
          title="Abrir menú completo"
        >
          <Menu size={18} />
          <span>Menú</span>
        </button>
      </nav>
    </div>
  );
};

