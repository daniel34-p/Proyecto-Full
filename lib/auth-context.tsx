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
}

interface AuthContextType {
  user: User | null;
  role: UserRole | null;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  isAsesor: boolean;
  isAuthenticated: boolean;
  centroCosto: CentroCosto | null;
  // Mensaje para mostrar en la pantalla de login (p.ej. "tu sesión expiró").
  // Se limpia automáticamente al iniciar sesión de nuevo.
  sessionMessage: string | null;
  clearSessionMessage: () => void;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  // logout acepta un mensaje opcional para explicarle al usuario por qué se
  // cerró la sesión (por ejemplo, cuando expiró en vez de un cierre manual).
  logout: (message?: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Lee la fecha de expiración (exp) de un JWT sin verificar su firma - solo
// para decidir en el cliente si vale la pena intentar usarlo o mostrar el
// login de una vez. La verificación real (con firma) siempre la hace el
// servidor en cada request; esto es únicamente para mejorar la experiencia,
// nunca se usa como control de seguridad.
function tokenEstaVencido(token: string): boolean {
  try {
    const payloadBase64 = token.split('.')[1];
    if (!payloadBase64) return true;
    const payloadJson = atob(payloadBase64.replace(/-/g, '+').replace(/_/g, '/'));
    const payload = JSON.parse(payloadJson);
    if (!payload.exp) return false; // sin campo exp, dejamos que el servidor decida
    return Date.now() >= payload.exp * 1000;
  } catch {
    // Si el token no se puede leer, lo tratamos como vencido/ inválido
    return true;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [sessionMessage, setSessionMessage] = useState<string | null>(null);

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    const savedToken = localStorage.getItem('token');

    if (savedUser && savedToken) {
      if (tokenEstaVencido(savedToken)) {
        // La sesión ya venció - la limpiamos de una vez y mostramos el
        // login con un mensaje claro, en vez de dejar que el usuario
        // navegue por la app con una sesión muerta que va a fallar en
        // cualquier momento (típicamente justo cuando intenta guardar algo).
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        setSessionMessage('Tu sesión expiró. Por favor inicia sesión de nuevo.');
      } else {
        setUser(JSON.parse(savedUser));
      }
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
      setSessionMessage(null);
      
      return { success: true };
    } catch (error) {
      return { success: false, error: 'Error de conexión' };
    }
  };

  const logout = (message?: string) => {
    setUser(null);
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    setSessionMessage(message || null);
  };

  const clearSessionMessage = () => setSessionMessage(null);

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