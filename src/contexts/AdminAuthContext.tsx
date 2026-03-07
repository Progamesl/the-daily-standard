import { createContext, useContext, useState, type ReactNode } from 'react';
import {
  type AdminUser,
  loginUser,
  logoutUser,
  getCurrentUser,
  ensureDefaultAdmin,
} from '@/lib/adminUserService';

interface AdminAuthState {
  isAuthenticated: boolean;
  currentUser: AdminUser | null;
  login: (username: string, password: string) => boolean;
  logout: () => void;
  refreshUser: () => void;
}

const AdminAuthContext = createContext<AdminAuthState>({
  isAuthenticated: false,
  currentUser: null,
  login: () => false,
  logout: () => {},
  refreshUser: () => {},
});

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  ensureDefaultAdmin();

  const [currentUser, setCurrentUser] = useState<AdminUser | null>(() =>
    getCurrentUser()
  );

  const login = (username: string, password: string): boolean => {
    const result = loginUser(username, password);
    if (result.user) {
      setCurrentUser(result.user);
      return true;
    }
    return false;
  };

  const logout = () => {
    logoutUser();
    setCurrentUser(null);
  };

  const refreshUser = () => {
    setCurrentUser(getCurrentUser());
  };

  return (
    <AdminAuthContext.Provider
      value={{
        isAuthenticated: !!currentUser,
        currentUser,
        login,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth() {
  return useContext(AdminAuthContext);
}
