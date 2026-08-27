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
  centroCosto?: { id: string; nombre: string } | null;
  // NUEVO: lista completa de centros (principal + adicionales)
  centrosCosto?: { id: string; nombre: string }[];
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
  });
  // NUEVO: múltiples centros seleccionados (checkboxes) en vez de uno solo
  const [centrosCostoIds, setCentrosCostoIds] = useState<string[]>([]);
  const [centrosCosto, setCentrosCosto] = useState<CentroCosto[]>([]);
  const [loadingCentros, setLoadingCentros] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [configModalOpen, setConfigModalOpen] = useState(false);
  const isEditing = !!usuarioToEdit;

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
      });
      const centrosActuales =
        usuarioToEdit.centrosCosto?.map((c) => c.id) ||
        (usuarioToEdit.centroCostoId ? [usuarioToEdit.centroCostoId] : []);
      setCentrosCostoIds(centrosActuales);
    } else {
      setFormData({ email: '', password: '', nombre: '', rol: 'asesor' });
      setCentrosCostoIds([]);
    }
  }, [usuarioToEdit]);

  const fetchCentrosCosto = async () => {
    setLoadingCentros(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/centros-costo', {
        headers: { Authorization: token ? `Bearer ${token}` : '' },
      });

      if (response.ok) {
        const data = await response.json();
        setCentrosCosto(data.filter((c: CentroCosto) => c.activo));
      }
    } catch (error) {
      console.error('Error al cargar centros de costo:', error);
    } finally {
      setLoadingCentros(false);
    }
  };

  const toggleCentro = (id: string) => {
    setCentrosCostoIds((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

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
    if (formData.rol !== 'superadmin' && centrosCostoIds.length === 0) {
      setError('Debes seleccionar al menos un centro de costo para Admin y Asesor');
      return;
    }
    if (formData.rol === 'superadmin' && centrosCostoIds.length > 0) {
      setError('Los SuperAdmin no pueden tener centro de costo');
      return;
    }

    setIsSubmitting(true);

    try {
      const url = isEditing ? `/api/usuarios/${usuarioToEdit.id}` : '/api/usuarios';
      const method = isEditing ? 'PUT' : 'POST';

      const body: any = {
        nombre: formData.nombre,
        rol: formData.rol,
        centrosCostoIds: formData.rol === 'superadmin' ? [] : centrosCostoIds,
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

      const token = localStorage.getItem('token');
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: token ? `Bearer ${token}` : '',
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
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar Usuario' : 'Nuevo Usuario'}</DialogTitle>
          <DialogDescription>
            {isEditing ? 'Modifica la información del usuario' : 'Completa los datos para crear un nuevo usuario'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
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

          {isEditing && (
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={formData.email} disabled className="bg-gray-100" />
              <p className="text-xs text-gray-500">El email no se puede modificar</p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="nombre">Nombre Completo *</Label>
            <Input
              id="nombre"
              value={formData.nombre}
              onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
              placeholder="Juan Pérez"
            />
          </div>

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
            {!isEditing && <p className="text-xs text-gray-500">Mínimo 6 caracteres</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="rol">Rol *</Label>
            <Select
              value={formData.rol}
              onValueChange={(value) => {
                setFormData({ ...formData, rol: value });
                if (value === 'superadmin') setCentrosCostoIds([]);
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

          {/* Centros de Costo - selección múltiple para Admin y Asesor.
              Si se marca más de uno, el usuario podrá navegar entre ellos
              con el menú hamburguesa, cada uno con su propio inventario. */}
          {requiresCentroCosto && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-blue-600" />
                  Centros de Costo *
                </Label>
                <Button
                  type="button"
                  variant="outline"
                  size="icon-sm"
                  onClick={() => setConfigModalOpen(true)}
                  title="Gestionar centros de costo"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              {loadingCentros ? (
                <p className="text-xs text-gray-500">Cargando centros...</p>
              ) : centrosCosto.length === 0 ? (
                <p className="text-xs text-gray-500">No hay centros de costo disponibles</p>
              ) : (
                <div className="border rounded-md p-2 max-h-48 overflow-y-auto space-y-1">
                  {centrosCosto.map((centro) => {
                    const seleccionado = centrosCostoIds.includes(centro.id);
                    return (
                      <label
                        key={centro.id}
                        className={`flex items-center gap-2 px-2 py-1.5 rounded-md text-sm cursor-pointer transition-colors ${
                          seleccionado ? 'bg-blue-50 text-blue-900' : 'hover:bg-gray-50'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={seleccionado}
                          onChange={() => toggleCentro(centro.id)}
                          className="h-4 w-4"
                        />
                        {centro.nombre}
                      </label>
                    );
                  })}
                </div>
              )}

              <p className="text-xs text-gray-500 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {centrosCostoIds.length > 1
                  ? `El usuario podrá navegar entre ${centrosCostoIds.length} centros (menú hamburguesa)`
                  : 'El usuario solo podrá ver productos de este centro'}
              </p>
            </div>
          )}

          {isSuperAdmin && (
            <div className="bg-purple-50 border border-purple-200 rounded-md p-3">
              <p className="text-xs text-purple-700 flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Los SuperAdmin no tienen centro de costo y pueden ver todos los productos
              </p>
            </div>
          )}

          {error && (
            <div className="p-3 text-sm text-red-500 bg-red-50 rounded-md border border-red-200">
              {error}
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-2">
            <Button type="submit" disabled={isSubmitting} className="flex-1 w-full">
              {isSubmitting ? 'Guardando...' : isEditing ? 'Actualizar' : 'Crear Usuario'}
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

        <CentrosCostoConfig
          isOpen={configModalOpen}
          onClose={() => setConfigModalOpen(false)}
          onCentroCreado={fetchCentrosCosto}
        />
      </DialogContent>
    </Dialog>
  );
}