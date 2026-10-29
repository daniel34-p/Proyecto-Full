'use client';

import { useState } from 'react';
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
import { Plus, Trash2, Loader2 } from 'lucide-react';

type TipoOpcion = 'proveedores' | 'unidades' | 'secciones';

interface OpcionesConfigProps {
  isOpen: boolean;
  onClose: () => void;
  tipo: TipoOpcion;
  // Centro de costo activo - obligatorio para 'proveedores'/'unidades'
  // (catálogo propio de cada centro); se ignora para 'secciones', que es
  // global. Viene del formulario que contiene este diálogo.
  centroCostoId?: string;
  // La lista vigente para este tipo y la función para avisarle al padre que
  // cambió, ambas recibidas por props: este componente ya no hace su propio
  // fetch al abrirse - el formulario que lo contiene (producto-form.tsx) ya
  // tiene el catálogo cargado, así que reusarlo evita una consulta de más
  // cada vez que alguien abre "Gestionar X".
  opciones: string[];
  onOpcionesChange: (nuevasOpciones: string[]) => void;
}

export function OpcionesConfig({ isOpen, onClose, tipo, centroCostoId, opciones, onOpcionesChange }: OpcionesConfigProps) {
  const [nuevaOpcion, setNuevaOpcion] = useState('');
  const [guardando, setGuardando] = useState(false);

  const authHeaders = () => {
    const token = localStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      Authorization: token ? `Bearer ${token}` : '',
    };
  };

  const agregarOpcion = async () => {
    if (!nuevaOpcion.trim() || guardando) return;

    const opcionUpper = nuevaOpcion.toUpperCase().trim();

    if (opciones.includes(opcionUpper)) {
      alert('Esta opción ya existe');
      return;
    }

    setGuardando(true);
    try {
      const response = await fetch('/api/opciones', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ tipo, valor: opcionUpper, centroCostoId }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        alert(data.error || 'No se pudo agregar la opción');
        return;
      }

      onOpcionesChange([...opciones, opcionUpper]);
      setNuevaOpcion('');
    } catch {
      alert('Error de conexión. Verifica tu internet.');
    } finally {
      setGuardando(false);
    }
  };

  const eliminarOpcion = async (opcion: string) => {
    if (guardando) return;

    if (opciones.length <= 1) {
      alert('Debe haber al menos una opción');
      return;
    }

    if (!confirm(`¿Eliminar "${opcion}"?`)) return;

    setGuardando(true);
    try {
      const response = await fetch('/api/opciones', {
        method: 'DELETE',
        headers: authHeaders(),
        body: JSON.stringify({ tipo, valor: opcion, centroCostoId }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        alert(data.error || 'No se pudo eliminar la opción');
        return;
      }

      onOpcionesChange(opciones.filter((o) => o !== opcion));
    } catch {
      alert('Error de conexión. Verifica tu internet.');
    } finally {
      setGuardando(false);
    }
  };

  const titulo = tipo === 'proveedores' ? 'Gestionar Proveedores' : tipo === 'unidades' ? 'Gestionar Unidades' : 'Gestionar Departamentos';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{titulo}</DialogTitle>
          <DialogDescription>
            Agrega o elimina opciones personalizadas - visibles para todos los usuarios del sistema
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Agregar nueva opción */}
          <div className="space-y-2">
            <Label htmlFor="nueva">Nueva {tipo === 'proveedores' ? 'Proveedor' : tipo === 'unidades' ? 'Unidad' : 'Departamento'}</Label>
            <div className="flex gap-2">
              <Input
                id="nueva"
                value={nuevaOpcion}
                onChange={(e) => setNuevaOpcion(e.target.value)}
                placeholder="Ej: DISTRIBUIDOR"
                disabled={guardando}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    agregarOpcion();
                  }
                }}
              />
              <Button onClick={agregarOpcion} size="sm" disabled={guardando}>
                {guardando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          {/* Lista de opciones actuales */}
          <div className="space-y-2">
            <Label>Opciones Actuales</Label>
            <div className="border rounded-md p-3 max-h-60 overflow-y-auto space-y-2">
              {opciones.map((opcion) => (
                <div
                  key={opcion}
                  className="flex justify-between items-center p-2 bg-gray-50 rounded"
                >
                  <span className="font-medium">{opcion}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => eliminarOpcion(opcion)}
                    disabled={guardando}
                  >
                    <Trash2 className="h-4 w-4 text-red-600" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <Button onClick={onClose} className="w-full">
            Cerrar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
