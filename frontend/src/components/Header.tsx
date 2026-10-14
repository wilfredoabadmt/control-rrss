import React from 'react';
import { LogOut, Menu, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface HeaderProps {
  title: string;
  onToggleSidebar?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ title, onToggleSidebar }) => {
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

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
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

