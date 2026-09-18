import React from 'react';
import {
  Activity,
  FileSpreadsheet,
  Layers,
  LucideIcon,
  MessageSquare,
  Radio,
  Settings,
  ShieldAlert,
  Users
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types';

export type ActivePage =
  | 'dashboard'
  | 'employees'
  | 'publications'
  | 'interactions'
  | 'reports'
  | 'audit'
  | 'admin';

interface SidebarProps {
  activePage: ActivePage;
  onSelectPage: (page: ActivePage) => void;
}

interface NavItem {
  id: ActivePage;
  label: string;
  icon: LucideIcon;
  roles?: UserRole[];
}

export const Sidebar: React.FC<SidebarProps> = ({ activePage, onSelectPage }) => {
  const { hasRole } = useAuth();

  const navItems: NavItem[] = [
    {
      id: 'dashboard',
      label: 'Panel Principal',
      icon: Activity,
    },
    {
      id: 'employees',
      label: 'Funcionarios',
      icon: Users,
      roles: [UserRole.SUPER_ADMIN, UserRole.DIRECTOR, UserRole.ANALYST, UserRole.OPERATOR],
    },
    {
      id: 'publications',
      label: 'Publicaciones & Campañas',
      icon: Radio,
      roles: [UserRole.SUPER_ADMIN, UserRole.COMMUNICATIONS_LEAD, UserRole.ANALYST, UserRole.OPERATOR],
    },
    {
      id: 'interactions',
      label: 'Verificación Epistémica',
      icon: MessageSquare,
      roles: [UserRole.SUPER_ADMIN, UserRole.COMMUNICATIONS_LEAD, UserRole.ANALYST, UserRole.OPERATOR],
    },
    {
      id: 'reports',
      label: 'Reportes Oficiales',
      icon: FileSpreadsheet,
      roles: [UserRole.SUPER_ADMIN, UserRole.AUDITOR, UserRole.DIRECTOR, UserRole.COMMUNICATIONS_LEAD, UserRole.ANALYST],
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
      roles: [UserRole.SUPER_ADMIN],
    },
  ];

  const visibleItems = navItems.filter((item) => !item.roles || hasRole(item.roles));

  return (
    <aside
      style={{
        width: '260px',
        background: 'rgba(15, 23, 42, 0.95)',
        backdropFilter: 'blur(16px)',
        borderRight: '1px solid var(--border-subtle)',
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        position: 'sticky',
        top: 0,
      }}
    >
      {/* Brand Header */}
      <div
        style={{
          padding: '24px 20px',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
        }}
      >
        <div
          style={{
            width: '38px',
            height: '38px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #06b6d4, #3b82f6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            boxShadow: '0 0 15px rgba(6, 182, 212, 0.4)',
          }}
        >
          <Layers size={20} />
        </div>
        <div>
          <h2 style={{ fontSize: '1rem', fontWeight: '700', color: '#fff', letterSpacing: '-0.02em' }}>
            GAMEA Monitor
          </h2>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Gestión Social & Analítica</span>
        </div>
      </div>

      {/* Navigation List */}
      <nav style={{ flex: 1, padding: '20px 12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {visibleItems.map((item) => {
          const Icon = item.icon;
          const isActive = activePage === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onSelectPage(item.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '11px 14px',
                borderRadius: 'var(--radius-md)',
                border: 'none',
                cursor: 'pointer',
                textAlign: 'left',
                fontSize: '0.875rem',
                fontWeight: isActive ? '600' : '500',
                background: isActive ? 'rgba(6, 182, 212, 0.15)' : 'transparent',
                color: isActive ? '#22d3ee' : 'var(--text-muted)',
                borderLeft: isActive ? '3px solid #06b6d4' : '3px solid transparent',
                transition: 'all 0.2s ease',
              }}
            >
              <Icon size={18} color={isActive ? '#06b6d4' : 'currentColor'} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Footer info */}
      <div
        style={{
          padding: '16px 20px',
          borderTop: '1px solid var(--border-subtle)',
          fontSize: '0.72rem',
          color: 'var(--text-faint)',
          textAlign: 'center',
        }}
      >
        GAMEA Social Monitor v1.0
        <br />
        Constitución & Auditoría Estricta
      </div>
    </aside>
  );
};
