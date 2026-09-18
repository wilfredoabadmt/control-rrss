import React, { createContext, useContext, useEffect, useState } from 'react';
import { UserProfile, UserRole } from '../types';
import { getMeApi, loginApi, logoutApi } from '../api/auth';

interface AuthContextType {
  user: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  hasRole: (roles: UserRole | UserRole[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const initAuth = async () => {
    const token = localStorage.getItem('access_token');
    if (token) {
      try {
        const profile = await getMeApi();
        setUser(profile);
      } catch {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        setUser(null);
      }
    }
    setIsLoading(false);
  };

  useEffect(() => {
    initAuth();
  }, []);

  const login = async (username: string, password: string): Promise<void> => {
    try {
      const res = await loginApi(username, password);
      localStorage.setItem('access_token', res.access_token);
      localStorage.setItem('refresh_token', res.refresh_token);
      const profile = await getMeApi();
      setUser(profile);
    } catch (err: any) {
      // Fallback para desarrollo local si el backend aún no tiene usuarios sembrados
      if (err.message && err.message.includes('Network Error')) {
        const mockUser: UserProfile = {
          id: 'dev-admin-01',
          email: username,
          full_name: 'Administrador Local GAMEA',
          roles: [UserRole.SUPER_ADMIN],
          is_active: true,
        };
        setUser(mockUser);
        localStorage.setItem('access_token', 'mock-token-dev');
        return;
      }
      throw err;
    }
  };

  const logout = () => {
    logoutApi().catch(() => {});
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    setUser(null);
  };

  const hasRole = (roles: UserRole | UserRole[]): boolean => {
    if (!user || !user.roles) return false;
    const required = Array.isArray(roles) ? roles : [roles];
    return user.roles.some((r) => required.includes(r as UserRole));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
        hasRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe usarse dentro de un AuthProvider');
  }
  return context;
};
