import React from 'react';
import {
  Activity,
  BarChart3,
  FileSpreadsheet,
  Layers,
  LucideIcon,
  MessageSquare,
  Radio,
  Settings,
  ShieldAlert,
  Users,
  X,
  Zap,
  TableProperties,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types';

export type ActivePage =
  | 'dashboard'
  | 'monitoring-hub'
  | 'employees'
  | 'publications'
  | 'interactions'
  | 'matrix'
  | 'analytics'
  | 'reports'
  | 'audit'
  | 'admin';

interface SidebarProps {
  activePage: ActivePage;
  onSelectPage: (page: ActivePage) => void;
  isOpen?: boolean;
  onClose?: () => void;
}

interface NavItem {
  id: ActivePage;
  label: string;
  icon: LucideIcon;
  roles?: UserRole[];
}

export const Sidebar: React.FC<SidebarProps> = ({
  activePage,
  onSelectPage,
  isOpen = false,
  onClose,
}) => {
  const { hasRole } = useAuth();

  const navItems: NavItem[] = [
    {
      id: 'dashboard',
      label: 'Panel Principal',
      icon: Activity,
    },
    {
      id: 'monitoring-hub',
      label: 'Auditoría RRSS & Scraper',
      icon: Zap,
      roles: [UserRole.SUPER_ADMIN, UserRole.DIRECTOR, UserRole.COMMUNICATIONS_LEAD, UserRole.ANALYST, UserRole.OPERATOR],
    },
    {
      id: 'employees',
      label: 'Funcionarios',
      icon: Users,
      roles: [UserRole.SUPER_ADMIN, UserRole.DIRECTOR, UserRole.COMMUNICATIONS_LEAD, UserRole.ANALYST, UserRole.OPERATOR],
    },
    {
      id: 'publications',
      label: 'Publicaciones & Campañas',
      icon: Radio,
      roles: [UserRole.SUPER_ADMIN, UserRole.DIRECTOR, UserRole.COMMUNICATIONS_LEAD, UserRole.ANALYST, UserRole.OPERATOR, UserRole.VIEWER],
    },
    {
      id: 'interactions',
      label: 'Control de Reacciones',
      icon: MessageSquare,
      roles: [UserRole.SUPER_ADMIN, UserRole.DIRECTOR, UserRole.COMMUNICATIONS_LEAD, UserRole.ANALYST, UserRole.OPERATOR],
    },
    {
      id: 'matrix',
      label: 'Matriz de Control',
      icon: TableProperties,
      roles: [UserRole.SUPER_ADMIN, UserRole.DIRECTOR, UserRole.COMMUNICATIONS_LEAD, UserRole.ANALYST, UserRole.OPERATOR],
    },
    {
      id: 'analytics',
      label: 'Analítica de Reacciones',
      icon: BarChart3,
      roles: [UserRole.SUPER_ADMIN, UserRole.DIRECTOR, UserRole.COMMUNICATIONS_LEAD, UserRole.ANALYST, UserRole.OPERATOR, UserRole.AUDITOR],
    },
    {
      id: 'reports',
      label: 'Reportes Oficiales',
      icon: FileSpreadsheet,
      roles: [UserRole.SUPER_ADMIN, UserRole.AUDITOR, UserRole.DIRECTOR, UserRole.COMMUNICATIONS_LEAD, UserRole.ANALYST, UserRole.VIEWER],
    },
    {
      id: 'audit',
      label: 'Auditoría Inmutable',
      icon: ShieldAlert,
      roles: [UserRole.SUPER_ADMIN, UserRole.AUDITOR],
    },
    {
      id: 'admin',
      label: 'Administración',
      icon: Settings,
      roles: [UserRole.SUPER_ADMIN, UserRole.DIRECTOR, UserRole.COMMUNICATIONS_LEAD],
    },
  ];

  const visibleItems = navItems.filter((item) => !item.roles || hasRole(item.roles));

  return (
    <>
      {/* Telón de fondo oscuro para móviles / tablets */}
      <div
        className={`sidebar-backdrop ${isOpen ? 'active' : ''}`}
        onClick={onClose}
        aria-hidden="true"
      />

      <aside className={`app-sidebar ${isOpen ? 'open' : ''}`}>
        {/* Encabezado Institucional */}
        <div className="sidebar-brand-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0, flex: 1 }}>
            <div className="sidebar-brand-icon">
              <Layers size={20} />
            </div>
            <div style={{ overflow: 'hidden' }}>
              <h2 style={{ fontSize: '1rem', fontWeight: '700', color: '#fff', letterSpacing: '-0.02em', margin: 0 }}>
                GAMEA Monitor
              </h2>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Gestión Social & Analítica</span>
            </div>
          </div>

          {/* Botón de Cierre en Dispositivos Móviles */}
          <button
            onClick={onClose}
            className="mobile-sidebar-close-btn"
            title="Cerrar panel"
            aria-label="Cerrar navegación"
          >
            <X size={18} />
          </button>
        </div>

        {/* Lista de Navegación */}
        <nav className="sidebar-nav-list">
          {visibleItems.map((item) => {
            const Icon = item.icon;
            const isActive = activePage === item.id;

            return (
              <button
                key={item.id}
                onClick={() => {
                  onSelectPage(item.id);
                  if (onClose) onClose();
                }}
                className={`sidebar-nav-item ${isActive ? 'active' : ''}`}
              >
                <Icon size={18} color={isActive ? '#06b6d4' : 'currentColor'} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Pie de Firma Institucional */}
        <div className="sidebar-footer">
          GAMEA Social Monitor v1.0
          <br />
          Constitución & Auditoría Estricta
        </div>
      </aside>
    </>
  );
};

