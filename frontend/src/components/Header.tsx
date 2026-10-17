import React from 'react';
import { BookOpen, LogOut, Menu, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface HeaderProps {
  title: string;
  onToggleSidebar?: () => void;
  onOpenManual?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ title, onToggleSidebar, onOpenManual }) => {
  const { user, logout } = useAuth();

  return (
    <header className="app-header">
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
        {/* Botón Hamburguesa para Móviles y Tablets */}
        <button
          onClick={onToggleSidebar}
          className="mobile-menu-btn"
          title="Abrir menú"
          aria-label="Abrir menú de navegación"
        >
          <Menu size={20} />
        </button>

        <h2 className="header-title" title={title}>
          {title}
        </h2>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
        {/* Botón Manual de Uso */}
        {onOpenManual && (
          <button
            onClick={onOpenManual}
            title="Abrir Manual y Guía de Uso del Sistema"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 13px',
              borderRadius: '9999px',
              background: 'rgba(6, 182, 212, 0.12)',
              border: '1px solid rgba(6, 182, 212, 0.35)',
              color: '#22d3ee',
              fontWeight: 600,
              fontSize: '0.8rem',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            <BookOpen size={15} />
            <span>Manual de Uso</span>
          </button>
        )}

        {/* User Pill Adaptable */}
        <div className="header-user-pill" title={`${user?.full_name || 'Funcionario'} (${user?.roles?.join(', ') || 'VIEWER'})`}>
          <div className="header-user-avatar">
            <User size={16} />
          </div>
          <div className="header-user-info" style={{ textAlign: 'left' }}>
            <div className="header-user-name">
              {user?.full_name || 'Funcionario GAMEA'}
            </div>
            <div className="header-user-roles">
              {user?.roles?.join(', ') || 'VIEWER'}
            </div>
          </div>
        </div>

        {/* Botón Salir */}
        <button
          onClick={logout}
          title="Cerrar sesión"
          className="header-logout-btn"
        >
          <LogOut size={15} />
          <span>Salir</span>
        </button>
      </div>
    </header>
  );
};

