'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { UsuariosTable } from '@/components/usuarios-table';
import { UsuarioForm } from '@/components/usuario-form';
import { SucursalesView } from '@/components/sucursales-view';
import { UserPlus, Users, Building2, Menu, X } from 'lucide-react';

interface Usuario {
  id: string;
  email: string;
  nombre: string;
  rol: string;
  activo: boolean;
  createdAt: string;
  _count?: {
    productosCreados: number;
    productosEditados: number;
  };
}

type VistaActiva = 'usuarios' | 'sucursales';

export function SuperAdminView() {
  const { user, logout } = useAuth();
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [usuarioToEdit, setUsuarioToEdit] = useState<Usuario | null>(null);

  const [menuOpen, setMenuOpen] = useState(false);
  const [vistaActiva, setVistaActiva] = useState<VistaActiva>('usuarios');

  const fetchUsuarios = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/usuarios', {
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Error al cargar usuarios:', errorData.error);
        setLoading(false);
        return;
      }

      const data = await response.json();
      setUsuarios(data);
    } catch (error) {
      console.error('Error al cargar usuarios:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsuarios();
  }, []);

  const handleEdit = (usuario: Usuario) => {
    setUsuarioToEdit(usuario);
    setFormOpen(true);
  };

  const handleToggleStatus = async (id: string, activo: boolean) => {
    if (!confirm(`¿Estás seguro de ${activo ? 'activar' : 'desactivar'} este usuario?`)) {
      return;
    }

    try {
      const usuario = usuarios.find(u => u.id === id);
      if (!usuario) return;

      const token = localStorage.getItem('token');
      const response = await fetch(`/api/usuarios/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : '',
        },
        body: JSON.stringify({
          nombre: usuario.nombre,
          rol: usuario.rol,
          activo,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        alert(errorData.error || 'Error al actualizar estado');
        return;
      }

      fetchUsuarios();
    } catch (error) {
      console.error('Error al cambiar estado:', error);
      alert('Error al cambiar estado del usuario');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar este usuario? Esta acción no se puede deshacer.')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/usuarios/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        alert(errorData.error || 'Error al eliminar usuario');
        return;
      }

      fetchUsuarios();
      alert('Usuario eliminado correctamente');
    } catch (error) {
      console.error('Error al eliminar usuario:', error);
      alert('Error al eliminar usuario');
    }
  };

  const handleSuccess = () => {
    fetchUsuarios();
    setFormOpen(false);
    setUsuarioToEdit(null);
  };

  // Estadísticas de usuarios
  const totalUsuarios = usuarios.length;
  const usuariosActivos = usuarios.filter(u => u.activo).length;
  const totalAdmins = usuarios.filter(u => u.rol === 'admin' || u.rol === 'superadmin').length;
  const totalAsesores = usuarios.filter(u => u.rol === 'asesor').length;

  const irAVista = (vista: VistaActiva) => {
    setVistaActiva(vista);
    setMenuOpen(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-lg">Cargando...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setMenuOpen(true)}
                className="text-white hover:bg-white/10 hover:text-white flex-shrink-0"
                aria-label="Abrir menú"
              >
                <Menu className="h-6 w-6" />
              </Button>
              <div>
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold flex items-center gap-2">
                  <Users className="h-6 w-6 sm:h-8 sm:w-8" />
                  <span className="hidden sm:inline">Panel de Super Admin</span>
                  <span className="sm:hidden">Super Admin</span>
                </h1>
                <p className="text-purple-100 mt-1 text-xs sm:text-sm">
                  Bienvenido, {user?.nombre}
                </p>
              </div>
            </div>
            <Button
              variant="secondary"
              onClick={logout}
              size="sm"
              className="w-full sm:w-auto"
            >
              Cerrar Sesión
            </Button>
          </div>
        </div>
      </header>

      {/* Overlay + menú lateral (hamburguesa) */}
      {menuOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40"
          onClick={() => setMenuOpen(false)}
        />
      )}
      <aside
        className={`fixed top-0 left-0 h-full w-72 bg-white shadow-xl z-50 transform transition-transform duration-200 ease-in-out ${
          menuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between px-4 py-4 border-b">
          <span className="font-semibold text-gray-900">Menú</span>
          <Button variant="ghost" size="icon" onClick={() => setMenuOpen(false)} aria-label="Cerrar menú">
            <X className="h-5 w-5" />
          </Button>
        </div>
        <nav className="p-2">
          <button
            onClick={() => irAVista('usuarios')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
              vistaActiva === 'usuarios'
                ? 'bg-purple-50 text-purple-700'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            <Users className="h-4 w-4" />
            Usuarios
          </button>
          <button
            onClick={() => irAVista('sucursales')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
              vistaActiva === 'sucursales'
                ? 'bg-purple-50 text-purple-700'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            <Building2 className="h-4 w-4" />
            Sucursales
          </button>
        </nav>
      </aside>

      {/* Contenido */}
      <main className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {vistaActiva === 'usuarios' && (
          <>
            {/* Tarjetas resumen */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Total Usuarios
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{totalUsuarios}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                    <Users className="h-4 w-4 text-green-600" />
                    Usuarios Activos
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-green-600">{usuariosActivos}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">
                    Administradores
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-blue-600">{totalAdmins}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">
                    Asesores
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-purple-600">{totalAsesores}</div>
                </CardContent>
              </Card>
            </div>

            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <h2 className="text-lg sm:text-2xl font-bold text-gray-900">Usuarios del Sistema</h2>
              <Button
                onClick={() => {
                  setUsuarioToEdit(null);
                  setFormOpen(true);
                }}
                className="flex items-center gap-2 w-full sm:w-auto"
                size="sm"
              >
                <UserPlus className="h-4 w-4" />
                Nuevo Usuario
              </Button>
            </div>

            <UsuariosTable
              usuarios={usuarios}
              onEdit={handleEdit}
              onToggleStatus={handleToggleStatus}
              onDelete={handleDelete}
            />
          </>
        )}

        {vistaActiva === 'sucursales' && <SucursalesView />}
      </main>

      {/* Modal de formulario de usuario */}
      <UsuarioForm
        isOpen={formOpen}
        onClose={() => {
          setFormOpen(false);
          setUsuarioToEdit(null);
        }}
        onSuccess={handleSuccess}
        usuarioToEdit={usuarioToEdit}
      />
    </div>
  );
}