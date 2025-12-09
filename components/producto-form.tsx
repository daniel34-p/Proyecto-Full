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
import { Plus, Search, X, PackagePlus } from 'lucide-react';
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
  mostrarBusqueda?: boolean; // Nuevo prop para controlar si se muestra la búsqueda
}

export function ProductoForm({ onSuccess, productoToEdit, onCancelEdit, mostrarBusqueda = false }: ProductoFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [configModal, setConfigModal] = useState<'proveedores' | 'unidades' | null>(null);
  const [proveedores, setProveedores] = useState<string[]>(['BODEGA', 'ALEA']);
  const [unidades, setUnidades] = useState<string[]>(['METROS', 'YARDAS', 'GRAMOS', 'UNIDAD']);
  const isEditing = !!productoToEdit;

  // Estados para búsqueda por referencia
  const [searchRef, setSearchRef] = useState('');
  const [searching, setSearching] = useState(false);
  const [productoEncontrado, setProductoEncontrado] = useState<Producto | null>(null);
  const [cantidadAgregar, setCantidadAgregar] = useState('');
  const [modoAgregar, setModoAgregar] = useState(false);

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
  }, [configModal]);

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

  // Buscar producto por referencia
  const buscarPorReferencia = async () => {
    if (!searchRef.trim()) {
      setError('Ingresa una referencia para buscar');
      return;
    }

    setSearching(true);
    setError('');
    setProductoEncontrado(null);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/productos', {
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
        },
      });

      if (!response.ok) {
        throw new Error('Error al buscar productos');
      }

      const productos = await response.json();
      const encontrado = productos.find(
        (p: Producto) => p.referencia.toUpperCase() === searchRef.toUpperCase().trim()
      );

      if (encontrado) {
        setProductoEncontrado(encontrado);
        setModoAgregar(true);
        setCantidadAgregar('');
      } else {
        setError(`No se encontró ningún producto con la referencia "${searchRef}"`);
      }
    } catch (err) {
      setError('Error al buscar el producto');
      console.error(err);
    } finally {
      setSearching(false);
    }
  };

  // Agregar cantidad al producto encontrado
  const agregarCantidad = async () => {
    if (!productoEncontrado) return;
    if (!cantidadAgregar || parseFloat(cantidadAgregar) <= 0) {
      setError('Ingresa una cantidad válida para agregar');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const nuevaCantidad = parseFloat(productoEncontrado.cantidad.toString()) + parseFloat(cantidadAgregar);

      const token = localStorage.getItem('token');
      const response = await fetch(`/api/productos/${productoEncontrado.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : '',
        },
        body: JSON.stringify({
          proveedor: productoEncontrado.proveedor,
          referencia: productoEncontrado.referencia,
          producto: productoEncontrado.producto,
          cantidad: nuevaCantidad.toString(),
          unidades: productoEncontrado.unidades,
          costo: productoEncontrado.costo,
          precioVenta: productoEncontrado.precioVenta,
          codigo: productoEncontrado.codigo,
          embalaje: productoEncontrado.embalaje,
          userId: JSON.parse(localStorage.getItem('user') || '{}').id,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al actualizar cantidad');
      }

      // Limpiar formulario de búsqueda
      setSearchRef('');
      setProductoEncontrado(null);
      setCantidadAgregar('');
      setModoAgregar(false);
      
      onSuccess();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Cancelar modo agregar
  const cancelarAgregar = () => {
    setSearchRef('');
    setProductoEncontrado(null);
    setCantidadAgregar('');
    setModoAgregar(false);
    setError('');
  };

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
            {modoAgregar ? '📦 Agregar Cantidad' : isEditing ? 'Editar Producto' : 'Nuevo Producto'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* MODO AGREGAR CANTIDAD */}
          {modoAgregar && productoEncontrado ? (
            <div className="space-y-4">
              {/* Info del producto encontrado */}
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <h3 className="font-semibold text-blue-900 mb-2">Producto Encontrado:</h3>
                <div className="space-y-1 text-sm">
                  <p><strong>Producto:</strong> {productoEncontrado.producto}</p>
                  <p><strong>Referencia:</strong> {productoEncontrado.referencia}</p>
                  <p><strong>Proveedor:</strong> {productoEncontrado.proveedor}</p>
                  <p className="text-lg font-bold text-blue-700">
                    Cantidad actual: {productoEncontrado.cantidad} {productoEncontrado.unidades}
                  </p>
                </div>
              </div>

              {/* Input para agregar cantidad */}
              <div className="space-y-2">
                <Label htmlFor="cantidadAgregar">Cantidad a Agregar *</Label>
                <Input
                  id="cantidadAgregar"
                  type="number"
                  step="0.01"
                  value={cantidadAgregar}
                  onChange={(e) => setCantidadAgregar(e.target.value)}
                  placeholder="Ej: 62.2"
                  className="text-lg"
                />
                <p className="text-xs text-gray-500">
                  Nueva cantidad será: <strong>{productoEncontrado.cantidad + (parseFloat(cantidadAgregar) || 0)} {productoEncontrado.unidades}</strong>
                </p>
              </div>

              {/* Error */}
              {error && (
                <div className="p-3 text-sm text-red-500 bg-red-50 rounded-md">
                  {error}
                </div>
              )}

              {/* Botones */}
              <div className="flex flex-col sm:flex-row gap-2">
                <Button 
                  onClick={agregarCantidad} 
                  disabled={isSubmitting || !cantidadAgregar}
                  className="flex-1 w-full"
                >
                  <PackagePlus className="h-4 w-4 mr-2" />
                  {isSubmitting ? 'Agregando...' : 'Agregar Cantidad'}
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={cancelarAgregar}
                  disabled={isSubmitting}
                  className="w-full sm:w-auto"
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancelar
                </Button>
              </div>
            </div>
          ) : (
            /* MODO NORMAL - FORMULARIO COMPLETO */
            <div className="space-y-4">
              {/* Búsqueda por referencia */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg border border-blue-200">
                <Label htmlFor="searchRef" className="text-blue-900 font-semibold mb-2 block">
                  🔍 Buscar por Referencia
                </Label>
                <p className="text-xs text-blue-700 mb-3">
                  Si el producto ya existe, podrás agregar cantidad directamente
                </p>
                <div className="flex gap-2">
                  <Input
                    id="searchRef"
                    value={searchRef}
                    onChange={(e) => setSearchRef(e.target.value.toUpperCase())}
                    placeholder="Ej: ABG-69"
                    className="flex-1 uppercase"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        buscarPorReferencia();
                      }
                    }}
                  />
                  <Button 
                    type="button"
                    onClick={buscarPorReferencia} 
                    disabled={searching || !searchRef.trim()}
                    variant="default"
                  >
                    <Search className="h-4 w-4" />
                    <span className="ml-2 hidden sm:inline">
                      {searching ? 'Buscando...' : 'Buscar'}
                    </span>
                  </Button>
                </div>
              </div>

              <div className="border-t pt-4">
                <p className="text-sm text-gray-600 mb-4 text-center">
                  O registra un producto nuevo:
                </p>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                  {/* Proveedor */}
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
                      placeholder="Ej: REF-001"
                      className="uppercase"
                      onChange={(e) => {
                        e.target.value = e.target.value.toUpperCase();
                        register('referencia').onChange(e);
                      }}
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

                  {/* Cantidad - AHORA ACEPTA DECIMALES */}
                  <div className="space-y-2">
                    <Label htmlFor="cantidad">Cantidad *</Label>
                    <Input
                      id="cantidad"
                      type="number"
                      step="0.01"
                      {...register('cantidad')}
                      placeholder="Ej: 10 o 62.5"
                    />
                    {errors.cantidad && (
                      <p className="text-sm text-red-500">{errors.cantidad.message}</p>
                    )}
                    <p className="text-xs text-gray-500">Acepta números enteros y decimales</p>
                  </div>

                  {/* Unidades */}
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

                  {/* Costo */}
                  <div className="space-y-2">
                    <Label htmlFor="costo">Costo (Código) *</Label>
                    <Input
                      id="costo"
                      {...register('costo')}
                      placeholder="X"
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
                      type="number"
                      {...register('codigo')}
                      placeholder="Ej: 123"
                    />
                    {errors.codigo && (
                      <p className="text-sm text-red-500">{errors.codigo.message}</p>
                    )}
                    <p className="text-xs text-gray-500">Solo números</p>
                  </div>

                  {/* Embalaje */}
                  <div className="space-y-2">
                    <Label htmlFor="embalaje">Embalaje</Label>
                    <Input
                      id="embalaje"
                      {...register('embalaje')}
                      placeholder="Ej: Caja, Paquete, Bolsa (Opcional)"
                    />
                    {errors.embalaje && (
                      <p className="text-sm text-red-500">{errors.embalaje.message}</p>
                    )}
                  </div>

                  {/* Error general del formulario (solo si no es error de búsqueda) */}
                  {error && (mostrarBusqueda ? modoAgregar : true) && (
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
              </div>
            </div>
          )}
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