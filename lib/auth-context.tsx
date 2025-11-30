'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type UserRole = 'admin' | 'asesor' | 'superadmin';

interface User {
  id: string;
  email: string;
  nombre: string;
  rol: UserRole;
}

interface AuthContextType {
  user: User | null;
  role: UserRole | null;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  isAsesor: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const error = await response.json();
        return { success: false, error: error.error || 'Error al iniciar sesión' };
      }

      const { user: userData, token } = await response.json();
      
      setUser(userData);
      localStorage.setItem('user', JSON.stringify(userData));
      localStorage.setItem('token', token);
      
      return { success: true };
    } catch (error) {
      return { success: false, error: 'Error de conexión' };
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('user');
    localStorage.removeItem('token');
  };

  if (isLoading) {
    return null;
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        role: user?.rol || null,
        isAdmin: user?.rol === 'admin' || user?.rol === 'superadmin',
        isSuperAdmin: user?.rol === 'superadmin',
        isAsesor: user?.rol === 'asesor',
        isAuthenticated: !!user,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe usarse dentro de AuthProvider');
  }
  return context;
}