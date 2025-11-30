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

interface Usuario {
  id: string;
  email: string;
  nombre: string;
  rol: string;
  activo: boolean;
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const isEditing = !!usuarioToEdit;

  useEffect(() => {
    if (usuarioToEdit) {
      setFormData({
        email: usuarioToEdit.email,
        password: '',
        nombre: usuarioToEdit.nombre,
        rol: usuarioToEdit.rol,
      });
    } else {
      setFormData({
        email: '',
        password: '',
        nombre: '',
        rol: 'asesor',
      });
    }
  }, [usuarioToEdit]);

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

    setIsSubmitting(true);

    try {
      const url = isEditing 
        ? `/api/usuarios/${usuarioToEdit.id}`
        : '/api/usuarios';
      
      const method = isEditing ? 'PUT' : 'POST';

      const body: any = {
        nombre: formData.nombre,
        rol: formData.rol,
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
              onValueChange={(value) => setFormData({ ...formData, rol: value })}
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
      </DialogContent>
    </Dialog>
  );
}