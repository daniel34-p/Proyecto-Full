'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { productoSchema, ProductoFormData } from '@/lib/validations';
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { OpcionesConfig } from '@/components/opciones-config';

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
  embalaje?: string;
}

interface ProductoFormProps {
  onSuccess: () => void;
  productoToEdit?: Producto | null;
  onCancelEdit?: () => void;
}

export function ProductoForm({ onSuccess, productoToEdit, onCancelEdit }: ProductoFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [configModal, setConfigModal] = useState<'proveedores' | 'unidades' | null>(null);
  const [proveedores, setProveedores] = useState<string[]>(['BODEGA', 'ALEA']);
  const [unidades, setUnidades] = useState<string[]>(['METROS', 'YARDAS', 'GRAMOS', 'UNIDAD']);
  const isEditing = !!productoToEdit;

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    reset,
    watch,
  } = useForm<ProductoFormData>({
    resolver: zodResolver(productoSchema),
  });

  // Cargar opciones personalizadas
  useEffect(() => {
    const customProveedores = localStorage.getItem('custom_proveedores');
    const customUnidades = localStorage.getItem('custom_unidades');

    if (customProveedores) {
      setProveedores(JSON.parse(customProveedores));
    }
    if (customUnidades) {
      setUnidades(JSON.parse(customUnidades));
    }
  }, [configModal]); // Recargar cuando se cierre el modal

  // Cargar datos cuando se va a editar
  useEffect(() => {
    if (productoToEdit) {
      setValue('proveedor', productoToEdit.proveedor);
      setValue('referencia', productoToEdit.referencia);
      setValue('producto', productoToEdit.producto);
      setValue('cantidad', productoToEdit.cantidad.toString());
      setValue('unidades', productoToEdit.unidades);
      setValue('costo', productoToEdit.costo);
      setValue('precioVenta', productoToEdit.precioVenta);
      setValue('codigo', productoToEdit.codigo);
      setValue('embalaje', productoToEdit.embalaje || '');
    } else {
      reset();
    }
  }, [productoToEdit, setValue, reset]);

  const onSubmit = async (data: ProductoFormData) => {
    setIsSubmitting(true);
    setError('');

    try {
      const url = isEditing 
        ? `/api/productos/${productoToEdit.id}`
        : '/api/productos';
      
      const method = isEditing ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...data,
          userId: JSON.parse(localStorage.getItem('user') || '{}').id,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al guardar producto');
      }

      reset();
      onSuccess();
      if (onCancelEdit) onCancelEdit();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>
            {isEditing ? 'Editar Producto' : 'Nuevo Producto'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Proveedor con botón + */}
            <div className="space-y-2">
              <Label htmlFor="proveedor">Proveedor *</Label>
              <div className="flex gap-2">
                <Select
                  onValueChange={(value) => setValue('proveedor', value)}
                  defaultValue={productoToEdit?.proveedor}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Selecciona un proveedor" />
                  </SelectTrigger>
                  <SelectContent>
                    {proveedores.map((prov) => (
                      <SelectItem key={prov} value={prov}>
                        {prov}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setConfigModal('proveedores')}
                  title="Gestionar proveedores"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {errors.proveedor && (
                <p className="text-sm text-red-500">{errors.proveedor.message}</p>
              )}
            </div>

            {/* Referencia */}
            <div className="space-y-2">
              <Label htmlFor="referencia">Referencia *</Label>
              <Input
                id="referencia"
                {...register('referencia')}
                placeholder="Ej: 2MM"
              />
              {errors.referencia && (
                <p className="text-sm text-red-500">{errors.referencia.message}</p>
              )}
            </div>

            {/* Producto */}
            <div className="space-y-2">
              <Label htmlFor="producto">Producto *</Label>
              <Input
                id="producto"
                {...register('producto')}
                placeholder="Ej: COLA DE RATON"
              />
              {errors.producto && (
                <p className="text-sm text-red-500">{errors.producto.message}</p>
              )}
            </div>

            {/* Cantidad */}
            <div className="space-y-2">
              <Label htmlFor="cantidad">Cantidad *</Label>
              <Input
                id="cantidad"
                type="number"
                {...register('cantidad')}
                placeholder="Ej: 100"
              />
              {errors.cantidad && (
                <p className="text-sm text-red-500">{errors.cantidad.message}</p>
              )}
            </div>

            {/* Unidades con botón + */}
            <div className="space-y-2">
              <Label htmlFor="unidades">Unidades *</Label>
              <div className="flex gap-2">
                <Select
                  onValueChange={(value) => setValue('unidades', value)}
                  defaultValue={productoToEdit?.unidades}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Selecciona unidad" />
                  </SelectTrigger>
                  <SelectContent>
                    {unidades.map((unidad) => (
                      <SelectItem key={unidad} value={unidad}>
                        {unidad}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setConfigModal('unidades')}
                  title="Gestionar unidades"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {errors.unidades && (
                <p className="text-sm text-red-500">{errors.unidades.message}</p>
              )}
            </div>

            {/* Costo (Encriptado) */}
            <div className="space-y-2">
              <Label htmlFor="costo">Costo (Código) *</Label>
              <Input
                id="costo"
                {...register('costo')}
                placeholder="Ej: HUB"
                className="uppercase"
              />
              {errors.costo && (
                <p className="text-sm text-red-500">{errors.costo.message}</p>
              )}
            </div>

            {/* Precio de Venta */}
            <div className="space-y-2">
              <Label htmlFor="precioVenta">Precio de Venta *</Label>
              <Input
                id="precioVenta"
                {...register('precioVenta')}
                placeholder="Ej: 15000"
              />
              {errors.precioVenta && (
                <p className="text-sm text-red-500">{errors.precioVenta.message}</p>
              )}
            </div>

            {/* Código */}
            <div className="space-y-2">
              <Label htmlFor="codigo">Código Producto *</Label>
              <Input
                id="codigo"
                type="number"
                {...register('codigo')}
                placeholder="Ej: 919"
              />
              {errors.codigo && (
                <p className="text-sm text-red-500">{errors.codigo.message}</p>
              )}
              <p className="text-xs text-gray-500">Solo números</p>
            </div>

            {/* Embalaje (Nuevo campo) */}
            <div className="space-y-2">
              <Label htmlFor="embalaje">Embalaje</Label>
              <Input
                id="embalaje"
                {...register('embalaje')}
                placeholder="Ej: 131 MTS"
              />
              {errors.embalaje && (
                <p className="text-sm text-red-500">{errors.embalaje.message}</p>
              )}
            </div>

            {/* Error general */}
            {error && (
              <div className="p-3 text-sm text-red-500 bg-red-50 rounded-md">
                {error}
              </div>
            )}

            {/* Botones */}
            <div className="flex flex-col sm:flex-row gap-2">
              <Button type="submit" disabled={isSubmitting} className="flex-1 w-full">
                {isSubmitting 
                  ? 'Guardando...' 
                  : isEditing 
                    ? 'Actualizar Producto' 
                    : 'Guardar Producto'}
              </Button>
              {isEditing && (
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={onCancelEdit}
                  disabled={isSubmitting}
                  className="w-full sm:w-auto"
                >
                  Cancelar
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Modales de configuración */}
      {configModal && (
        <OpcionesConfig
          isOpen={true}
          onClose={() => setConfigModal(null)}
          tipo={configModal}
        />
      )}
    </>
  );
}