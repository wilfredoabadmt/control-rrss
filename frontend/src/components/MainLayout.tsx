import React, { useState, useEffect } from 'react';
import { Sidebar, ActivePage } from './Sidebar';
import { Header } from './Header';
import { SectionManualModal } from './SectionManualModal';
import { SectionGuideBanner } from './SectionGuideBanner';
import { Activity, Zap, Users, Menu } from 'lucide-react';

interface MainLayoutProps {
  children: (activePage: ActivePage, onNavigate: (page: ActivePage) => void) => React.ReactNode;
}

export const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const [activePage, setActivePage] = useState<ActivePage>('dashboard');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState<boolean>(false);
  const [isManualOpen, setIsManualOpen] = useState<boolean>(false);

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
    dashboard: 'Panel General de Monitoreo',
    'mae-dashboard': 'Tablero de Decisiones MAE',
    analytics: 'Analítica y Cumplimiento de Personal',
    interactions: 'Registro y Verificación de Reacciones',
    publications: 'Publicaciones Oficiales Monitoreadas',
    employees: 'Padrón de Personal Municipal',
    reports: 'Reportes y Descargas Oficiales',
    admin: 'Configuración y Control de Acceso',
    audit: 'Registro Histórico de Acciones',
    // Compatibilidad para redirecciones
    'monitoring-hub': 'Registro y Verificación de Reacciones',
    matrix: 'Analítica y Cumplimiento de Personal',
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
          title={pageTitles[activePage] || 'GAMEA Social Monitor'}
          onToggleSidebar={() => setIsMobileSidebarOpen((prev) => !prev)}
          onOpenManual={() => setIsManualOpen(true)}
        />
        <main className="main-content-layout">
          {/* Banner de Guía Rápida Contextual de la Sección */}
          <SectionGuideBanner
            activePage={activePage}
            onOpenManual={() => setIsManualOpen(true)}
          />

          {children(activePage, setActivePage)}
        </main>
      </div>

      {/* Modal Interactivo de Manual y Guía de Uso del Sistema */}
      <SectionManualModal
        isOpen={isManualOpen}
        onClose={() => setIsManualOpen(false)}
        initialSection={activePage}
      />

      {/* Barra de navegación inferior móvil (< 768px) */}
      <nav className="mobile-bottom-nav">
        <button
          className={`mobile-bottom-nav-item ${activePage === 'dashboard' ? 'active' : ''}`}
          onClick={() => setActivePage('dashboard')}
          title="Panel General"
        >
          <Activity size={18} />
          <span>Panel</span>
        </button>

        <button
          className={`mobile-bottom-nav-item ${activePage === 'analytics' ? 'active' : ''}`}
          onClick={() => setActivePage('analytics')}
          title="Analítica y Cumplimiento"
        >
          <Activity size={18} />
          <span>Analítica</span>
        </button>

        <button
          className={`mobile-bottom-nav-item ${activePage === 'interactions' ? 'active' : ''}`}
          onClick={() => setActivePage('interactions')}
          title="Registro de Reacciones"
        >
          <Zap size={18} />
          <span>Reacciones</span>
        </button>

        <button
          className={`mobile-bottom-nav-item ${activePage === 'employees' ? 'active' : ''}`}
          onClick={() => setActivePage('employees')}
          title="Padrón de Personal"
        >
          <Users size={18} />
          <span>Personal</span>
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

