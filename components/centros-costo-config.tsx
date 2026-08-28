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
import { Plus, Trash2, Building2, Loader2, Power, Pencil, Check, X } from 'lucide-react';
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
  const [eliminandoId, setEliminandoId] = useState<string | null>(null);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [nombreEditado, setNombreEditado] = useState('');
  const [guardandoId, setGuardandoId] = useState<string | null>(null);
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

      await cargarCentros();
      // Avisa al padre (p.ej. la vista de Sucursales) para que refresque
      // su propia lista y el centro desaparezca/reaparezca donde aplique.
      if (onCentroCreado) onCentroCreado();
    } catch (err: any) {
      setError(err.message || 'Error al actualizar centro de costo');
      console.error('Error:', err);
    }
  };

  const iniciarEdicion = (centro: CentroCosto) => {
    setEditandoId(centro.id);
    setNombreEditado(centro.nombre);
    setError('');
  };

  const cancelarEdicion = () => {
    setEditandoId(null);
    setNombreEditado('');
    setError('');
  };

  const guardarNombre = async (centro: CentroCosto) => {
    const nombre = nombreEditado.trim();

    if (!nombre) {
      setError('El nombre del centro de costo no puede estar vacío');
      return;
    }

    if (nombre === centro.nombre) {
      cancelarEdicion();
      return;
    }

    if (centros.some(c => c.id !== centro.id && c.nombre.toLowerCase() === nombre.toLowerCase())) {
      setError('Ya existe un centro de costo con ese nombre');
      return;
    }

    setGuardandoId(centro.id);
    setError('');

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/centros-costo/${centro.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : '',
        },
        body: JSON.stringify({ nombre }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al actualizar centro de costo');
      }

      setEditandoId(null);
      setNombreEditado('');
      await cargarCentros();
      if (onCentroCreado) onCentroCreado();
    } catch (err: any) {
      setError(err.message || 'Error al actualizar centro de costo');
      console.error('Error:', err);
    } finally {
      setGuardandoId(null);
    }
  };

  // NUEVO: eliminación definitiva. El backend ya valida que no tenga
  // usuarios (ni como centro principal ni como adicional) ni productos
  // asociados - si los tiene, devuelve un error explicando cuántos, y
  // aquí simplemente se lo mostramos al usuario.
  const eliminarCentro = async (centro: CentroCosto) => {
    const confirmado = confirm(
      `¿Eliminar definitivamente "${centro.nombre}"? Esta acción no se puede deshacer. Solo es posible si no tiene usuarios ni productos asignados.`
    );
    if (!confirmado) return;

    setEliminandoId(centro.id);
    setError('');

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/centros-costo/${centro.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al eliminar centro de costo');
      }

      await cargarCentros();
      if (onCentroCreado) onCentroCreado();
    } catch (err: any) {
      setError(err.message || 'Error al eliminar centro de costo');
      console.error('Error:', err);
    } finally {
      setEliminandoId(null);
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
              <div className="border rounded-md p-3 max-h-72 overflow-y-auto space-y-2">
                {centros.map((centro) => (
                  <div
                    key={centro.id}
                    className="flex justify-between items-center p-3 bg-gray-50 rounded-md hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex-1">
                      {editandoId === centro.id ? (
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-blue-600 flex-shrink-0" />
                          <Input
                            value={nombreEditado}
                            onChange={(e) => {
                              setNombreEditado(e.target.value);
                              setError('');
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                guardarNombre(centro);
                              } else if (e.key === 'Escape') {
                                e.preventDefault();
                                cancelarEdicion();
                              }
                            }}
                            className="h-8"
                            autoFocus
                            disabled={guardandoId === centro.id}
                          />
                        </div>
                      ) : (
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
                      )}
                      {centro._count && editandoId !== centro.id && (
                        <div className="text-xs text-gray-500 mt-1 ml-6">
                          {centro._count.usuarios} usuario{centro._count.usuarios !== 1 ? 's' : ''} • {' '}
                          {centro._count.productos} producto{centro._count.productos !== 1 ? 's' : ''}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      {editandoId === centro.id ? (
                        <>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => guardarNombre(centro)}
                            disabled={guardandoId === centro.id || !nombreEditado.trim()}
                            title="Guardar nombre"
                          >
                            {guardandoId === centro.id ? (
                              <Loader2 className="h-4 w-4 animate-spin text-green-600" />
                            ) : (
                              <Check className="h-4 w-4 text-green-600" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={cancelarEdicion}
                            disabled={guardandoId === centro.id}
                            title="Cancelar"
                          >
                            <X className="h-4 w-4 text-gray-500" />
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => iniciarEdicion(centro)}
                            title="Editar nombre"
                          >
                            <Pencil className="h-4 w-4 text-blue-600" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => toggleActivoCentro(centro.id, centro.activo)}
                            title={centro.activo ? 'Desactivar (deja de verse en Sucursales)' : 'Activar de nuevo'}
                          >
                            <Power className={`h-4 w-4 ${centro.activo ? 'text-amber-600' : 'text-green-600'}`} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => eliminarCentro(centro)}
                            disabled={eliminandoId === centro.id}
                            title="Eliminar definitivamente"
                          >
                            {eliminandoId === centro.id ? (
                              <Loader2 className="h-4 w-4 animate-spin text-red-600" />
                            ) : (
                              <Trash2 className="h-4 w-4 text-red-600" />
                            )}
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Información */}
          <div className="bg-blue-50 border border-blue-200 rounded-md p-3 text-xs text-blue-700">
            <p className="font-semibold mb-1">💡 Información:</p>
            <ul className="space-y-1 ml-4">
              <li>• Puedes editar el nombre de un centro con el lápiz; el cambio se refleja en todos sus usuarios y productos</li>
              <li>• Un centro desactivado deja de aparecer en la vista de Sucursales y no se puede asignar a nuevos usuarios</li>
              <li>• Los usuarios existentes mantienen su centro aunque esté inactivo</li>
              <li>• Eliminar es permanente y solo se puede hacer si el centro no tiene usuarios ni productos asociados</li>
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