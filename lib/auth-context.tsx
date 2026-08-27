'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type UserRole = 'admin' | 'asesor' | 'superadmin';

interface CentroCosto {
  id: string;
  nombre: string;
}

interface User {
  id: string;
  email: string;
  nombre: string;
  rol: UserRole;
  centroCosto?: CentroCosto | null;
  centroCostoId?: string | null;
  // NUEVO: lista completa de centros de costo del usuario (principal +
  // adicionales). Para un usuario de un solo centro, trae un solo elemento.
  centrosCosto?: CentroCosto[];
}

interface AuthContextType {
  user: User | null;
  role: UserRole | null;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  isAsesor: boolean;
  isAuthenticated: boolean;
  centroCosto: CentroCosto | null;
  // NUEVO: todos los centros del usuario, y cuál está "activo" ahora mismo
  // (el que se está viendo/editando en pantalla vía el menú hamburguesa).
  centrosCosto: CentroCosto[];
  centroCostoActivo: CentroCosto | null;
  setCentroCostoActivo: (centro: CentroCosto) => void;
  sessionMessage: string | null;
  clearSessionMessage: () => void;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: (message?: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function tokenEstaVencido(token: string): boolean {
  try {
    const payloadBase64 = token.split('.')[1];
    if (!payloadBase64) return true;
    const payloadJson = atob(payloadBase64.replace(/-/g, '+').replace(/_/g, '/'));
    const payload = JSON.parse(payloadJson);
    if (!payload.exp) return false;
    return Date.now() >= payload.exp * 1000;
  } catch {
    return true;
  }
}

// Deriva la lista de centros de un usuario, con fallback para el caso de
// un objeto "user" guardado por una sesión antigua que no traía
// "centrosCosto" (antes de este cambio) - así no se rompe nada para
// sesiones ya iniciadas.
function centrosDeUsuario(u: User | null): CentroCosto[] {
  if (!u) return [];
  if (u.centrosCosto && u.centrosCosto.length > 0) return u.centrosCosto;
  return u.centroCosto ? [u.centroCosto] : [];
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [centroCostoActivo, setCentroCostoActivoState] = useState<CentroCosto | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [sessionMessage, setSessionMessage] = useState<string | null>(null);

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    const savedToken = localStorage.getItem('token');

    if (savedUser && savedToken) {
      if (tokenEstaVencido(savedToken)) {
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        localStorage.removeItem('centroCostoActivoId');
        setSessionMessage('Tu sesión expiró. Por favor inicia sesión de nuevo.');
      } else {
        const parsedUser: User = JSON.parse(savedUser);
        setUser(parsedUser);

        const centros = centrosDeUsuario(parsedUser);
        const savedActivoId = localStorage.getItem('centroCostoActivoId');
        const activo = centros.find((c) => c.id === savedActivoId) || centros[0] || null;
        setCentroCostoActivoState(activo);
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
      setSessionMessage(null);

      const centros = centrosDeUsuario(userData);
      const activo = centros[0] || null;
      setCentroCostoActivoState(activo);
      if (activo) {
        localStorage.setItem('centroCostoActivoId', activo.id);
      } else {
        localStorage.removeItem('centroCostoActivoId');
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: 'Error de conexión' };
    }
  };

  const logout = (message?: string) => {
    setUser(null);
    setCentroCostoActivoState(null);
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    localStorage.removeItem('centroCostoActivoId');
    setSessionMessage(message || null);
  };

  const clearSessionMessage = () => setSessionMessage(null);

  const setCentroCostoActivo = (centro: CentroCosto) => {
    setCentroCostoActivoState(centro);
    localStorage.setItem('centroCostoActivoId', centro.id);
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
        centroCosto: user?.centroCosto || null,
        centrosCosto: centrosDeUsuario(user),
        centroCostoActivo,
        setCentroCostoActivo,
        sessionMessage,
        clearSessionMessage,
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