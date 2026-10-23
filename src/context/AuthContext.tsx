import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo } from 'react';
import { User, UserRole } from '../types';
import { api } from '../services/api';
import { INITIAL_USERS } from '../data/initialUsers';

export const AUTH_STORAGE_KEY = 'dcn_current_user_v1';

export function getUserInitials(name?: string, login?: string): string {
  if (!name && !login) return '??';
  const text = (name || login || '').trim();
  const parts = text.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  if (text.includes('.')) {
    const dotParts = text.split('.');
    return (dotParts[0][0] + (dotParts[1]?.[0] || '')).toUpperCase();
  }
  return text.substring(0, 2).toUpperCase();
}

export function getRoleBadgeInfo(role?: UserRole): { label: string; bg: string; text: string; border: string } {
  switch (role) {
    case 'ADMIN':
      return {
        label: 'ADMINISTRADOR',
        bg: 'bg-rose-50',
        text: 'text-rose-700',
        border: 'border-rose-200'
      };
    case 'ENGINEER':
      return {
        label: 'ENGENHARIA',
        bg: 'bg-cyan-50',
        text: 'text-[#00386e]',
        border: 'border-cyan-300'
      };
    case 'OPERATOR':
    default:
      return {
        label: 'OPERADOR',
        bg: 'bg-slate-100',
        text: 'text-slate-700',
        border: 'border-slate-300'
      };
  }
}

interface AuthContextType {
  currentUser: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isOfflineMode: boolean;
  login: (login: string, senha: string) => Promise<{ success: boolean; user: User; message: string; isOffline?: boolean }>;
  logout: () => void;
  // RBAC helpers
  role: UserRole | null;
  isAdmin: boolean;
  isEngineer: boolean;
  isOperator: boolean;
  canCreateDCN: boolean;
  canEditDCN: boolean;
  canDeleteDCN: boolean;
  canManageTechnicians: boolean;
  canDeleteTechnicians: boolean;
  canAccessAudit: boolean;
  canPerformEngineeringReview: boolean;
  roleBadge: { label: string; bg: string; text: string; border: string };
  userInitials: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      const stored = localStorage.getItem(AUTH_STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored) as User;
      }
    } catch (err) {
      console.error('[Auth] Erro ao carregar usuário salvo do localStorage:', err);
    }
    return null;
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isOfflineMode, setIsOfflineMode] = useState(false);

  // Restaurar sessão e sincronizar localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(AUTH_STORAGE_KEY);
      if (stored && !currentUser) {
        const parsed = JSON.parse(stored) as User;
        setCurrentUser(parsed);
      }
    } catch (e) {
      console.error('[Auth] Erro na restauração da sessão:', e);
    }
  }, []);

  const login = async (loginStr: string, senhaStr: string) => {
    setIsLoading(true);
    try {
      const result = await api.login(loginStr, senhaStr);
      if (result.success && result.user) {
        setCurrentUser(result.user);
        setIsOfflineMode(!!result.isOffline);
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(result.user));
      }
      return result;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    try {
      localStorage.removeItem(AUTH_STORAGE_KEY);
    } catch (e) {
      console.error('[Auth] Erro ao limpar localStorage no logout:', e);
    }
    setCurrentUser(null);
    setIsOfflineMode(false);
    // Recarregar a página para limpar estados em memória conforme especificação
    window.location.reload();
  };

  const role = currentUser?.role || null;
  const isAdmin = role === 'ADMIN';
  const isEngineer = role === 'ENGINEER';
  const isOperator = role === 'OPERATOR';

  // Matriz de permissões (RBAC)
  const canCreateDCN = isAdmin || isEngineer;
  const canEditDCN = isAdmin || isEngineer;
  const canDeleteDCN = isAdmin; // Exclusão estrita apenas para ADMIN
  const canManageTechnicians = isAdmin || isEngineer;
  const canDeleteTechnicians = isAdmin;
  const canAccessAudit = isAdmin || isEngineer;
  const canPerformEngineeringReview = isAdmin || isEngineer;

  const roleBadge = useMemo(() => getRoleBadgeInfo(role || 'OPERATOR'), [role]);
  const userInitials = useMemo(() => getUserInitials(currentUser?.nome, currentUser?.login), [currentUser]);

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        isAuthenticated: !!currentUser,
        isLoading,
        isOfflineMode,
        login,
        logout,
        role,
        isAdmin,
        isEngineer,
        isOperator,
        canCreateDCN,
        canEditDCN,
        canDeleteDCN,
        canManageTechnicians,
        canDeleteTechnicians,
        canAccessAudit,
        canPerformEngineeringReview,
        roleBadge,
        userInitials
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser utilizado dentro de um <AuthProvider>');
  }
  return context;
}
