'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Plus, Trash2, Building2, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface CentroCosto {
  id: string;
  nombre: string;
  activo: boolean;
  _count?: {
    usuarios: number;
    productos: number;
  };
}

interface CentrosCostoConfigProps {
  isOpen: boolean;
  onClose: () => void;
  onCentroCreado?: () => void;
}

export function CentrosCostoConfig({ isOpen, onClose, onCentroCreado }: CentrosCostoConfigProps) {
  const [centros, setCentros] = useState<CentroCosto[]>([]);
  const [nuevoCentro, setNuevoCentro] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      cargarCentros();
    }
  }, [isOpen]);

  const cargarCentros = async () => {
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/centros-costo', {
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
        },
      });

      if (!response.ok) {
        throw new Error('Error al cargar centros de costo');
      }

      const data = await response.json();
      setCentros(data);
    } catch (err: any) {
      setError(err.message || 'Error al cargar centros de costo');
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const agregarCentro = async () => {
    if (!nuevoCentro.trim()) {
      setError('Ingresa un nombre para el centro de costo');
      return;
    }

    // Validar que no exista
    if (centros.some(c => c.nombre.toLowerCase() === nuevoCentro.trim().toLowerCase())) {
      setError('Ya existe un centro de costo con ese nombre');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/centros-costo', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : '',
        },
        body: JSON.stringify({
          nombre: nuevoCentro.trim(),
          activo: true,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al crear centro de costo');
      }

      const nuevoCentroCreado = await response.json();
      setCentros([...centros, nuevoCentroCreado]);
      setNuevoCentro('');
      
      // Notificar al componente padre
      if (onCentroCreado) {
        onCentroCreado();
      }
    } catch (err: any) {
      setError(err.message || 'Error al crear centro de costo');
      console.error('Error:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const toggleActivoCentro = async (id: string, activo: boolean) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/centros-costo/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : '',
        },
        body: JSON.stringify({ activo: !activo }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al actualizar centro');
      }

      // Recargar centros
      await cargarCentros();
    } catch (err: any) {
      setError(err.message || 'Error al actualizar centro de costo');
      console.error('Error:', err);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-blue-600" />
            Gestionar Centros de Costo
          </DialogTitle>
          <DialogDescription>
            Administra los centros de costo disponibles en el sistema
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Agregar nuevo centro */}
          <div className="space-y-2">
            <Label htmlFor="nuevo">Nuevo Centro de Costo</Label>
            <div className="flex gap-2">
              <Input
                id="nuevo"
                value={nuevoCentro}
                onChange={(e) => {
                  setNuevoCentro(e.target.value);
                  setError('');
                }}
                placeholder="Ej: Metroherrajes"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    agregarCentro();
                  }
                }}
                disabled={submitting}
              />
              <Button 
                onClick={agregarCentro} 
                size="sm"
                disabled={submitting || !nuevoCentro.trim()}
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          {/* Mensaje de error */}
          {error && (
            <div className="p-3 text-sm text-red-500 bg-red-50 rounded-md border border-red-200">
              {error}
            </div>
          )}

          {/* Lista de centros actuales */}
          <div className="space-y-2">
            <Label>Centros de Costo Existentes</Label>
            
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
              </div>
            ) : centros.length === 0 ? (
              <div className="text-center py-8 text-gray-500 text-sm">
                No hay centros de costo registrados
              </div>
            ) : (
              <div className="border rounded-md p-3 max-h-60 overflow-y-auto space-y-2">
                {centros.map((centro) => (
                  <div
                    key={centro.id}
                    className="flex justify-between items-center p-3 bg-gray-50 rounded-md hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-blue-600" />
                        <span className="font-medium">{centro.nombre}</span>
                        {centro.activo ? (
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">
                            Activo
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-gray-100 text-gray-600 border-gray-300">
                            Inactivo
                          </Badge>
                        )}
                      </div>
                      {centro._count && (
                        <div className="text-xs text-gray-500 mt-1 ml-6">
                          {centro._count.usuarios} usuario{centro._count.usuarios !== 1 ? 's' : ''} • {' '}
                          {centro._count.productos} producto{centro._count.productos !== 1 ? 's' : ''}
                        </div>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleActivoCentro(centro.id, centro.activo)}
                      title={centro.activo ? 'Desactivar' : 'Activar'}
                    >
                      {centro.activo ? (
                        <Trash2 className="h-4 w-4 text-red-600" />
                      ) : (
                        <span className="text-xs text-green-600">Activar</span>
                      )}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Información */}
          <div className="bg-blue-50 border border-blue-200 rounded-md p-3 text-xs text-blue-700">
            <p className="font-semibold mb-1">💡 Información:</p>
            <ul className="space-y-1 ml-4">
              <li>• Los centros desactivados no se pueden asignar a nuevos usuarios</li>
              <li>• Los usuarios existentes mantienen su centro aunque esté inactivo</li>
              <li>• No se pueden eliminar centros con usuarios o productos asociados</li>
            </ul>
          </div>

          <Button onClick={onClose} className="w-full">
            Cerrar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}