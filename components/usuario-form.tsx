'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Building2, AlertCircle, Plus } from 'lucide-react';
import { CentrosCostoConfig } from '@/components/centros-costo-config';

interface CentroCosto {
  id: string;
  nombre: string;
  activo: boolean;
}

interface Usuario {
  id: string;
  email: string;
  nombre: string;
  rol: string;
  activo: boolean;
  centroCostoId?: string | null;
  centroCosto?: {
    id: string;
    nombre: string;
  } | null;
}

interface UsuarioFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  usuarioToEdit?: Usuario | null;
}

export function UsuarioForm({ isOpen, onClose, onSuccess, usuarioToEdit }: UsuarioFormProps) {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    nombre: '',
    rol: 'asesor',
    centroCostoId: '',
  });
  const [centrosCosto, setCentrosCosto] = useState<CentroCosto[]>([]);
  const [loadingCentros, setLoadingCentros] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [configModalOpen, setConfigModalOpen] = useState(false);
  const isEditing = !!usuarioToEdit;

  // Cargar centros de costo al abrir el modal
  useEffect(() => {
    if (isOpen) {
      fetchCentrosCosto();
    }
  }, [isOpen]);

  useEffect(() => {
    if (usuarioToEdit) {
      setFormData({
        email: usuarioToEdit.email,
        password: '',
        nombre: usuarioToEdit.nombre,
        rol: usuarioToEdit.rol,
        centroCostoId: usuarioToEdit.centroCostoId || '',
      });
    } else {
      setFormData({
        email: '',
        password: '',
        nombre: '',
        rol: 'asesor',
        centroCostoId: '',
      });
    }
  }, [usuarioToEdit]);

  const fetchCentrosCosto = async () => {
    setLoadingCentros(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/centros-costo', {
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
        },
      });

      if (response.ok) {
        const data = await response.json();
        // Filtrar solo centros activos
        setCentrosCosto(data.filter((c: CentroCosto) => c.activo));
      }
    } catch (error) {
      console.error('Error al cargar centros de costo:', error);
    } finally {
      setLoadingCentros(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validaciones
    if (!formData.nombre.trim()) {
      setError('El nombre es requerido');
      return;
    }

    if (!isEditing && !formData.email.trim()) {
      setError('El email es requerido');
      return;
    }

    if (!isEditing && !formData.password) {
      setError('La contraseña es requerida');
      return;
    }

    if (formData.password && formData.password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    // Validar centro de costo según rol
    if (formData.rol !== 'superadmin' && !formData.centroCostoId) {
      setError('Debes seleccionar un centro de costo para Admin y Asesor');
      return;
    }

    if (formData.rol === 'superadmin' && formData.centroCostoId) {
      setError('Los SuperAdmin no pueden tener centro de costo');
      return;
    }

    setIsSubmitting(true);

    try {
      const url = isEditing 
        ? `/api/usuarios/${usuarioToEdit.id}`
        : '/api/usuarios';
      
      const method = isEditing ? 'PUT' : 'POST';

      const body: any = {
        nombre: formData.nombre,
        rol: formData.rol,
        centroCostoId: formData.rol === 'superadmin' ? null : formData.centroCostoId || null,
      };

      if (!isEditing) {
        body.email = formData.email;
        body.password = formData.password;
      } else if (formData.password) {
        body.password = formData.password;
      }

      if (isEditing) {
        body.activo = usuarioToEdit.activo;
      }

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al guardar usuario');
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const requiresCentroCosto = formData.rol === 'admin' || formData.rol === 'asesor';
  const isSuperAdmin = formData.rol === 'superadmin';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Editar Usuario' : 'Nuevo Usuario'}
          </DialogTitle>
          <DialogDescription>
            {isEditing 
              ? 'Modifica la información del usuario' 
              : 'Completa los datos para crear un nuevo usuario'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email - solo en creación */}
          {!isEditing && (
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="usuario@ejemplo.com"
              />
            </div>
          )}

          {/* Email - solo lectura en edición */}
          {isEditing && (
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                disabled
                className="bg-gray-100"
              />
              <p className="text-xs text-gray-500">El email no se puede modificar</p>
            </div>
          )}

          {/* Nombre */}
          <div className="space-y-2">
            <Label htmlFor="nombre">Nombre Completo *</Label>
            <Input
              id="nombre"
              value={formData.nombre}
              onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
              placeholder="Juan Pérez"
            />
          </div>

          {/* Contraseña */}
          <div className="space-y-2">
            <Label htmlFor="password">
              Contraseña {isEditing ? '(dejar vacío para no cambiar)' : '*'}
            </Label>
            <Input
              id="password"
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              placeholder="••••••••"
            />
            {!isEditing && (
              <p className="text-xs text-gray-500">Mínimo 6 caracteres</p>
            )}
          </div>

          {/* Rol */}
          <div className="space-y-2">
            <Label htmlFor="rol">Rol *</Label>
            <Select
              value={formData.rol}
              onValueChange={(value) => {
                setFormData({ 
                  ...formData, 
                  rol: value,
                  // Limpiar centro de costo si es superadmin
                  centroCostoId: value === 'superadmin' ? '' : formData.centroCostoId
                });
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecciona un rol" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="asesor">Asesor</SelectItem>
                <SelectItem value="admin">Administrador</SelectItem>
                <SelectItem value="superadmin">Super Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Centro de Costo - Solo para Admin y Asesor */}
          {requiresCentroCosto && (
            <div className="space-y-2">
              <Label htmlFor="centroCosto" className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-blue-600" />
                Centro de Costo *
              </Label>
              <div className="flex gap-2">
                <Select
                  value={formData.centroCostoId}
                  onValueChange={(value) => setFormData({ ...formData, centroCostoId: value })}
                  disabled={loadingCentros}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder={loadingCentros ? "Cargando..." : "Selecciona un centro de costo"} />
                  </SelectTrigger>
                  <SelectContent>
                    {centrosCosto.length === 0 ? (
                      <SelectItem value="none" disabled>
                        No hay centros de costo disponibles
                      </SelectItem>
                    ) : (
                      centrosCosto.map((centro) => (
                        <SelectItem key={centro.id} value={centro.id}>
                          {centro.nombre}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setConfigModalOpen(true)}
                  title="Gestionar centros de costo"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-gray-500 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                El usuario solo podrá ver productos de este centro
              </p>
            </div>
          )}

          {/* Mensaje informativo para SuperAdmin */}
          {isSuperAdmin && (
            <div className="bg-purple-50 border border-purple-200 rounded-md p-3">
              <p className="text-xs text-purple-700 flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Los SuperAdmin no tienen centro de costo y pueden ver todos los productos
              </p>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="p-3 text-sm text-red-500 bg-red-50 rounded-md border border-red-200">
              {error}
            </div>
          )}

          {/* Botones */}
          <div className="flex flex-col sm:flex-row gap-2">
            <Button type="submit" disabled={isSubmitting} className="flex-1 w-full">
              {isSubmitting 
                ? 'Guardando...' 
                : isEditing 
                  ? 'Actualizar' 
                  : 'Crear Usuario'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
              className="w-full sm:w-auto"
            >
              Cancelar
            </Button>
          </div>
        </form>

        {/* Modal de gestión de centros de costo */}
        <CentrosCostoConfig
          isOpen={configModalOpen}
          onClose={() => setConfigModalOpen(false)}
          onCentroCreado={fetchCentrosCosto}
        />
      </DialogContent>
    </Dialog>
  );
}