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
import { Plus, Trash2 } from 'lucide-react';

interface OpcionesConfigProps {
  isOpen: boolean;
  onClose: () => void;
  tipo: 'proveedores' | 'unidades';
}

export function OpcionesConfig({ isOpen, onClose, tipo }: OpcionesConfigProps) {
  const [opciones, setOpciones] = useState<string[]>([]);
  const [nuevaOpcion, setNuevaOpcion] = useState('');

  useEffect(() => {
    if (isOpen) {
      cargarOpciones();
    }
  }, [isOpen, tipo]);

  const cargarOpciones = () => {
    const key = tipo === 'proveedores' ? 'custom_proveedores' : 'custom_unidades';
    const guardadas = localStorage.getItem(key);
    
    if (guardadas) {
      setOpciones(JSON.parse(guardadas));
    } else {
      // Valores por defecto
      if (tipo === 'proveedores') {
        setOpciones(['BODEGA', 'ALEA']);
      } else {
        setOpciones(['METROS', 'YARDAS', 'GRAMOS', 'UNIDADES', 'ROLLOS']);
      }
    }
  };

  const guardarOpciones = (nuevasOpciones: string[]) => {
    const key = tipo === 'proveedores' ? 'custom_proveedores' : 'custom_unidades';
    localStorage.setItem(key, JSON.stringify(nuevasOpciones));
    setOpciones(nuevasOpciones);
  };

  const agregarOpcion = () => {
    if (!nuevaOpcion.trim()) return;
    
    const opcionUpper = nuevaOpcion.toUpperCase().trim();
    
    if (opciones.includes(opcionUpper)) {
      alert('Esta opción ya existe');
      return;
    }

    const nuevasOpciones = [...opciones, opcionUpper];
    guardarOpciones(nuevasOpciones);
    setNuevaOpcion('');
  };

  const eliminarOpcion = (opcion: string) => {
    if (opciones.length <= 1) {
      alert('Debe haber al menos una opción');
      return;
    }

    if (!confirm(`¿Eliminar "${opcion}"?`)) return;

    const nuevasOpciones = opciones.filter(o => o !== opcion);
    guardarOpciones(nuevasOpciones);
  };

  const titulo = tipo === 'proveedores' ? 'Gestionar Proveedores' : 'Gestionar Unidades';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{titulo}</DialogTitle>
          <DialogDescription>
            Agrega o elimina opciones personalizadas
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Agregar nueva opción */}
          <div className="space-y-2">
            <Label htmlFor="nueva">Nueva {tipo === 'proveedores' ? 'Proveedor' : 'Unidad'}</Label>
            <div className="flex gap-2">
              <Input
                id="nueva"
                value={nuevaOpcion}
                onChange={(e) => setNuevaOpcion(e.target.value)}
                placeholder="Ej: DISTRIBUIDOR"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    agregarOpcion();
                  }
                }}
              />
              <Button onClick={agregarOpcion} size="sm">
                <Plus className="h-4 w-4" />
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