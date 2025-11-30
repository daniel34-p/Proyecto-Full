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
import { formatearCostoReal } from '@/lib/encryption';
import { CheckCircle2, Edit2, X } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface Producto {
  id: string;
  proveedor: string;
  referencia: string;
  producto: string;
  cantidad: number;
  unidades: string;
  costo: string;
  costoReal: number;
  precioVenta: string;
  codigo: string;
  codigoBarras: string;
  creadoPor?: {
  nombre: string;
  email: string;
  rol: string;
};
editadoPor?: {
  nombre: string;
  email: string;
  rol: string;
};
}

interface ScannedProductViewProps {
  producto: Producto | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

export function ScannedProductView({
  producto,
  isOpen,
  onClose,
  onUpdate,
}: ScannedProductViewProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  
  // Estados para los campos editables
  const [formData, setFormData] = useState({
    producto: '',
    cantidad: '',
    costo: '',
    precioVenta: '',
    codigo: '',
  });

  useEffect(() => {
    if (producto) {
      setFormData({
        producto: producto.producto,
        cantidad: producto.cantidad.toString(),
        costo: producto.costo,
        precioVenta: producto.precioVenta,
        codigo: producto.codigo,
      });
    }
  }, [producto]);

  if (!producto) return null;

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError('');
  };

  const handleUpdate = async () => {
    // Validaciones
    if (!formData.producto.trim()) {
      setError('El nombre del producto es requerido');
      return;
    }
    if (!formData.cantidad || parseInt(formData.cantidad) < 0) {
      setError('Ingresa una cantidad válida');
      return;
    }
    if (!formData.costo.trim() || !/^[A-Za-z]+$/.test(formData.costo)) {
      setError('El costo debe contener solo letras');
      return;
    }
    if (!formData.precioVenta.trim()) {
      setError('El precio de venta es requerido');
      return;
    }
    if (!formData.codigo.trim()) {
      setError('El código es requerido');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/productos/${producto.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : '',
        },
        body: JSON.stringify({
          proveedor: producto.proveedor,
          referencia: producto.referencia,
          producto: formData.producto,
          cantidad: formData.cantidad,
          unidades: producto.unidades,
          costo: formData.costo,
          precioVenta: formData.precioVenta,
          codigo: formData.codigo,
          userId: JSON.parse(localStorage.getItem('user') || '{}').id,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al actualizar');
      }

      setIsEditing(false);
      onUpdate();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error al actualizar producto');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setFormData({
      producto: producto.producto,
      cantidad: producto.cantidad.toString(),
      costo: producto.costo,
      precioVenta: producto.precioVenta,
      codigo: producto.codigo,
    });
    setError('');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            Producto Encontrado
          </DialogTitle>
          <DialogDescription>
            {isEditing ? 'Edita la información del producto' : 'Información del producto escaneado'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {!isEditing ? (
            /* Vista de solo lectura */
            <div className="bg-gray-50 p-4 rounded-md space-y-3">
              <div>
                <p className="text-sm text-gray-600">Producto</p>
                <p className="font-semibold text-lg">{producto.producto}</p>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-600">Código</p>
                  <p className="font-medium">{producto.codigo}</p>
                </div>
                <div>
                  <p className="text-gray-600">Código de Barras</p>
                  <p className="font-mono text-xs">{producto.codigoBarras}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-600">Proveedor</p>
                  <p className="font-medium capitalize">{producto.proveedor}</p>
                </div>
                <div>
                  <p className="text-gray-600">Referencia</p>
                  <p className="font-medium">{producto.referencia}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-600">Cantidad</p>
                  <p className="font-bold text-lg">
                    {producto.cantidad} {producto.unidades}
                  </p>
                </div>
                <div>
                  <p className="text-gray-600">Precio de Venta</p>
                  <p className="font-bold text-lg">${producto.precioVenta}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-600">Costo (Código)</p>
                  <p className="font-mono uppercase">{producto.costo}</p>
                </div>
                <div>
                  <p className="text-gray-600">Costo Real</p>
                  <p className="font-medium">${formatearCostoReal(producto.costoReal)}</p>
                </div>
              </div>
            </div>
          ) : (
            /* Modo de edición */
            <div className="space-y-3">
              {/* Producto */}
              <div>
                <Label htmlFor="producto">Producto *</Label>
                <Input
                  id="producto"
                  value={formData.producto}
                  onChange={(e) => handleInputChange('producto', e.target.value)}
                  placeholder="Nombre del producto"
                />
              </div>

              {/* Cantidad */}
              <div>
                <Label htmlFor="cantidad">Cantidad *</Label>
                <Input
                  id="cantidad"
                  type="number"
                  value={formData.cantidad}
                  onChange={(e) => handleInputChange('cantidad', e.target.value)}
                  placeholder="0"
                />
              </div>

              {/* Costo */}
              <div>
                <Label htmlFor="costo">Costo (Código) *</Label>
                <Input
                  id="costo"
                  value={formData.costo}
                  onChange={(e) => handleInputChange('costo', e.target.value.toUpperCase())}
                  placeholder="ABC (solo letras)"
                  className="uppercase"
                />
                <p className="text-xs text-gray-500 mt-1">Solo letras</p>
              </div>

              {/* Precio de Venta */}
              <div>
                <Label htmlFor="precioVenta">Precio de Venta *</Label>
                <Input
                  id="precioVenta"
                  value={formData.precioVenta}
                  onChange={(e) => handleInputChange('precioVenta', e.target.value)}
                  placeholder="0.00"
                />
              </div>

              {/* Código */}
              <div>
                <Label htmlFor="codigo">Código *</Label>
                <Input
                  id="codigo"
                  value={formData.codigo}
                  onChange={(e) => handleInputChange('codigo', e.target.value)}
                  placeholder="Código del producto"
                />
              </div>

              {/* Info no editable */}
              <div className="bg-gray-50 p-3 rounded-md text-sm">
                <p className="text-gray-600 mb-1">Información fija:</p>
                <p className="text-xs">Proveedor: <span className="font-medium capitalize">{producto.proveedor}</span></p>
                <p className="text-xs">Referencia: <span className="font-medium">{producto.referencia}</span></p>
                <p className="text-xs">Unidades: <span className="font-medium">{producto.unidades}</span></p>
                <p className="text-xs">Código de Barras: <span className="font-mono">{producto.codigoBarras}</span></p>
              </div>
            </div>
          )}

          {/* Mensaje de error */}
          {error && (
            <div className="p-3 text-sm text-red-500 bg-red-50 rounded-md border border-red-200">
              {error}
            </div>
          )}

          {/* Botones */}
          <div className="space-y-2">
            {!isEditing ? (
              <>
                <Button
                  onClick={() => setIsEditing(true)}
                  className="w-full"
                  size="sm"
                >
                  <Edit2 className="h-4 w-4 mr-2" />
                  Editar Producto
                </Button>
                <Button 
                  variant="outline" 
                  onClick={onClose} 
                  className="w-full"
                  size="sm"
                >
                  Cerrar
                </Button>
              </>
            ) : (
              <>
                <Button
                  onClick={handleUpdate}
                  disabled={isSubmitting}
                  className="w-full"
                  size="sm"
                >
                  {isSubmitting ? 'Guardando...' : 'Guardar Cambios'}
                </Button>
                <Button
                  variant="outline"
                  onClick={handleCancel}
                  disabled={isSubmitting}
                  className="w-full"
                  size="sm"
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancelar
                </Button>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}