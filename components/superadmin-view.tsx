'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UsuariosTable } from '@/components/usuarios-table';
import { UsuarioForm } from '@/components/usuario-form';
import { UserPlus, Users, Package, BarChart3 } from 'lucide-react';

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

export function SuperAdminView() {
  const { user, logout } = useAuth();
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [usuarioToEdit, setUsuarioToEdit] = useState<Usuario | null>(null);

  const fetchUsuarios = async () => {
    try {
      const response = await fetch('/api/usuarios');
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

      const response = await fetch(`/api/usuarios/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
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
      const response = await fetch(`/api/usuarios/${id}`, {
        method: 'DELETE',
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

  // Estadísticas
  const totalUsuarios = usuarios.length;
  const usuariosActivos = usuarios.filter(u => u.activo).length;
  const totalAdmins = usuarios.filter(u => u.rol === 'admin' || u.rol === 'superadmin').length;
  const totalAsesores = usuarios.filter(u => u.rol === 'asesor').length;

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

      {/* Contenido */}
        <main className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
        <Tabs defaultValue="usuarios" className="space-y-4 sm:space-y-6">
            <TabsList className="grid w-full grid-cols-2 h-auto">
            <TabsTrigger value="usuarios" className="text-xs sm:text-sm py-2 sm:py-3">
                <Users className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">Gestión de </span>Usuarios
            </TabsTrigger>
            <TabsTrigger value="estadisticas" className="text-xs sm:text-sm py-2 sm:py-3">
                <BarChart3 className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                Estadísticas
            </TabsTrigger>
            </TabsList>

          {/* Tab de Gestión de Usuarios */}
          <TabsContent value="usuarios" className="space-y-6">
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
          </TabsContent>

          {/* Tab de Estadísticas */}
          <TabsContent value="estadisticas" className="space-y-6">
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

            {/* Información adicional */}
            <Card>
              <CardHeader>
                <CardTitle>Información del Sistema</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-gray-50 p-4 rounded-md">
                    <h3 className="font-semibold text-gray-700 mb-2">Roles Disponibles</h3>
                    <ul className="space-y-1 text-sm text-gray-600">
                      <li>• <strong>Asesor:</strong> Puede registrar y escanear productos</li>
                      <li>• <strong>Admin:</strong> Gestión completa del inventario</li>
                      <li>• <strong>Super Admin:</strong> Gestión de usuarios y sistema</li>
                    </ul>
                  </div>
                  <div className="bg-blue-50 p-4 rounded-md">
                    <h3 className="font-semibold text-blue-700 mb-2">Acciones Disponibles</h3>
                    <ul className="space-y-1 text-sm text-blue-600">
                      <li>• Crear nuevos usuarios</li>
                      <li>• Editar información de usuarios</li>
                      <li>• Activar/Desactivar usuarios</li>
                      <li>• Eliminar usuarios del sistema</li>
                      <li>• Ver estadísticas de actividad</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      {/* Modal de formulario */}
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