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
}

interface ProductoFormProps {
  onSuccess: () => void;
  productoToEdit?: Producto | null;
  onCancelEdit?: () => void;
}

export function ProductoForm({ onSuccess, productoToEdit, onCancelEdit }: ProductoFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const isEditing = !!productoToEdit;

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    reset,
  } = useForm<ProductoFormData>({
    resolver: zodResolver(productoSchema),
  });

  // Cargar datos cuando se va a editar
  useEffect(() => {
    if (productoToEdit) {
      setValue('proveedor', productoToEdit.proveedor as 'bodega' | 'alea');
      setValue('referencia', productoToEdit.referencia);
      setValue('producto', productoToEdit.producto);
      setValue('cantidad', productoToEdit.cantidad.toString());
      setValue('unidades', productoToEdit.unidades as any);
      setValue('costo', productoToEdit.costo);
      setValue('precioVenta', productoToEdit.precioVenta);
      setValue('codigo', productoToEdit.codigo);
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

      const token = localStorage.getItem('token');
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : '',
        },
        body: JSON.stringify({
          ...data,
          userId: JSON.parse(localStorage.getItem('user') || '{}').id,
        })});

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
    <Card>
      <CardHeader>
        <CardTitle>
          {isEditing ? 'Editar Producto' : 'Nuevo Producto'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Proveedor */}
          <div className="space-y-2">
            <Label htmlFor="proveedor">Proveedor *</Label>
            <Select
              onValueChange={(value) => setValue('proveedor', value as 'bodega' | 'alea')}
              defaultValue={productoToEdit?.proveedor}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecciona un proveedor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="bodega">Bodega</SelectItem>
                <SelectItem value="alea">Alea</SelectItem>
              </SelectContent>
            </Select>
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
              placeholder="Ej: REF-001"
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
              placeholder="Nombre del producto"
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
              placeholder="0"
            />
            {errors.cantidad && (
              <p className="text-sm text-red-500">{errors.cantidad.message}</p>
            )}
          </div>

          {/* Unidades */}
          <div className="space-y-2">
            <Label htmlFor="unidades">Unidades *</Label>
            <Select
              onValueChange={(value) =>
                setValue('unidades', value as 'metros' | 'yardas' | 'gramos' | 'unidad')
              }
              defaultValue={productoToEdit?.unidades}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecciona unidad" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="metros">Metros</SelectItem>
                <SelectItem value="yardas">Yardas</SelectItem>
                <SelectItem value="gramos">Gramos</SelectItem>
                <SelectItem value="unidad">Unidad</SelectItem>
              </SelectContent>
            </Select>
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
              placeholder="Ej: XDF, AXO (solo letras)"
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
              placeholder="0.00"
            />
            {errors.precioVenta && (
              <p className="text-sm text-red-500">{errors.precioVenta.message}</p>
            )}
          </div>

          {/* Código */}
          <div className="space-y-2">
            <Label htmlFor="codigo">Código *</Label>
            <Input
              id="codigo"
              {...register('codigo')}
              placeholder="Código único del producto"
            />
            {errors.codigo && (
              <p className="text-sm text-red-500">{errors.codigo.message}</p>
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
                onClick={handleCancel}
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
  );
}
