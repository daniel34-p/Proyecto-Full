'use client';

import { useState, useEffect, useCallback } from 'react';
import { ProductosTable } from '@/components/productos-table';
import { InventoryStats } from '@/components/inventory-stats';
import { ProductoForm } from '@/components/producto-form';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ArrowLeft, Building2 } from 'lucide-react';

interface Producto {
  id: string;
  proveedor: string;
  referencia: string;
  producto: string;
  cantidad: number;
  unidades: string;
  seccion?: string;
  costo: string;
  costoReal: number;
  precioVenta: string;
  codigo: string;
  codigoBarras: string;
  embalaje?: string;
  activo: boolean;
  createdAt: string;
  centroCosto?: {
    id: string;
    nombre: string;
  };
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

interface QueryState {
  page: number;
  pageSize: number;
  search: string;
  proveedor: string;
  unidades: string;
  seccion: string;
  creadoPorId: string;
  centroCostoId: string;
  estado: string;
}

interface SucursalInventarioProps {
  centroCosto: { id: string; nombre: string };
  onVolver: () => void;
}

export function SucursalInventario({ centroCosto, onVolver }: SucursalInventarioProps) {
  const queryInicial: QueryState = {
    page: 1,
    pageSize: 50,
    search: '',
    proveedor: 'todos',
    unidades: 'todos',
    seccion: 'todos',
    creadoPorId: 'todos',
    centroCostoId: centroCosto.id, // fijo: esta vista siempre es de esta sucursal
    estado: 'todos',
  };

  const [productos, setProductos] = useState<Producto[]>([]);
  const [paginacion, setPaginacion] = useState({ page: 1, pageSize: 50, total: 0, totalPages: 1 });
  const [queryState, setQueryState] = useState<QueryState>(queryInicial);
  const [loadingProductos, setLoadingProductos] = useState(true);
  const [loadingStats, setLoadingStats] = useState(true);

  const [opciones, setOpciones] = useState({
    proveedores: [] as string[],
    unidades: [] as string[],
    secciones: [] as string[],
    creadores: [] as { id: string; nombre: string }[],
    // Se deja siempre vacío a propósito: así el filtro "Centro de Costo" de
    // ProductosTable no aparece, porque esta vista ya está fija a una sola
    // sucursal (ver condición isSuperAdmin && opciones.centrosCosto.length > 0
    // dentro de productos-table.tsx).
    centrosCosto: [] as { id: string; nombre: string }[],
  });

  const [estadisticas, setEstadisticas] = useState<{
    totalProductos: number;
    proveedores: { nombre: string; totalProductos: number; valorTotal: number }[];
    departamentos: { nombre: string; totalProductos: number; valorTotal: number }[];
    granTotal: number;
  } | null>(null);

  const [productoToEdit, setProductoToEdit] = useState<Producto | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);

  const authHeaders = () => {
    const token = localStorage.getItem('token');
    return { Authorization: token ? `Bearer ${token}` : '' };
  };

  const buildQueryString = (q: QueryState) => {
    const params = new URLSearchParams();
    params.set('page', String(q.page));
    params.set('pageSize', String(q.pageSize));
    params.set('centroCostoId', centroCosto.id); // siempre fijo
    if (q.search) params.set('search', q.search);
    if (q.proveedor !== 'todos') params.set('proveedor', q.proveedor);
    if (q.unidades !== 'todos') params.set('unidades', q.unidades);
    if (q.seccion !== 'todos') params.set('seccion', q.seccion);
    if (q.creadoPorId !== 'todos') params.set('creadoPorId', q.creadoPorId);
    if (q.estado !== 'todos') params.set('estado', q.estado);
    return params.toString();
  };

  const fetchProductos = useCallback(async (q: QueryState) => {
    setLoadingProductos(true);
    try {
      const response = await fetch(`/api/productos?${buildQueryString(q)}`, {
        headers: authHeaders(),
      });
      if (!response.ok) throw new Error('Error al cargar productos');
      const data = await response.json();
      setProductos(data.productos);
      setPaginacion(data.pagination);
    } catch (error) {
      console.error('Error al cargar productos de la sucursal:', error);
    } finally {
      setLoadingProductos(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [centroCosto.id]);

  const fetchOpciones = useCallback(async () => {
    try {
      const response = await fetch(`/api/productos/filtros?centroCostoId=${centroCosto.id}`, {
        headers: authHeaders(),
      });
      if (!response.ok) return;
      const data = await response.json();
      // Nunca sobrescribimos centrosCosto: se mantiene vacío a propósito
      setOpciones((prev) => ({ ...prev, ...data, centrosCosto: [] }));
    } catch (error) {
      console.error('Error al cargar opciones de filtro de la sucursal:', error);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [centroCosto.id]);

  const fetchEstadisticas = useCallback(async () => {
    setLoadingStats(true);
    try {
      const response = await fetch(`/api/productos/estadisticas?centroCostoId=${centroCosto.id}`, {
        headers: authHeaders(),
      });
      if (!response.ok) return;
      const data = await response.json();
      setEstadisticas(data);
    } catch (error) {
      console.error('Error al cargar estadísticas de la sucursal:', error);
    } finally {
      setLoadingStats(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [centroCosto.id]);

  useEffect(() => {
    fetchProductos(queryState);
  }, [queryState, fetchProductos]);

  useEffect(() => {
    fetchOpciones();
    fetchEstadisticas();
  }, [fetchOpciones, fetchEstadisticas]);

  const handleFiltrosChange = (parcial: Partial<QueryState>) => {
    setQueryState((prev) => ({ ...prev, ...parcial, page: 1 }));
  };

  const handleLimpiarFiltros = () => {
    setQueryState(queryInicial);
  };

  const handlePageChange = (page: number) => {
    setQueryState((prev) => ({ ...prev, page }));
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar este producto?')) return;
    try {
      const response = await fetch(`/api/productos/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: authHeaders(),
      });
      if (!response.ok) {
        const errorData = await response.json();
        alert(errorData.error || 'Error al eliminar producto');
        return;
      }
      await Promise.all([fetchProductos(queryState), fetchEstadisticas()]);
    } catch (error) {
      console.error('Error al eliminar producto:', error);
      alert('Error al eliminar producto');
    }
  };

  const handleToggleActivo = async (id: string, activo: boolean) => {
    const mensaje = activo
      ? '¿Reactivar este producto? Volverá a contarse en el inventario.'
      : '¿Dar de baja este producto? No se eliminará, pero dejará de contarse en el inventario.';
    if (!confirm(mensaje)) return;

    try {
      const response = await fetch(`/api/productos/${encodeURIComponent(id)}/estado`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ activo }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        alert(errorData.error || 'Error al cambiar el estado del producto');
        return;
      }
      await Promise.all([fetchProductos(queryState), fetchEstadisticas()]);
    } catch (error) {
      console.error('Error al cambiar estado del producto:', error);
      alert('Error al cambiar el estado del producto');
    }
  };

  const handleEdit = (producto: Producto) => {
    setProductoToEdit(producto);
    setEditModalOpen(true);
  };

  const handleEditSuccess = async () => {
    await Promise.all([fetchProductos(queryState), fetchEstadisticas(), fetchOpciones()]);
    setEditModalOpen(false);
    setProductoToEdit(null);
  };

  return (
    <div className="space-y-6">
      {/* Encabezado de la sucursal */}
      <div className="flex items-center gap-3">
        <Button variant="outline" size="sm" onClick={onVolver}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          Volver a Sucursales
        </Button>
        <div className="flex items-center gap-2 text-lg font-semibold text-gray-900">
          <Building2 className="h-5 w-5 text-purple-600" />
          {centroCosto.nombre}
        </div>
      </div>

      {/* Estadísticas de esta sucursal */}
      <InventoryStats estadisticas={estadisticas} loading={loadingStats} />

      {/* Tabla de productos de esta sucursal */}
      <ProductosTable
        productos={productos}
        onDelete={handleDelete}
        onEdit={handleEdit}
        onToggleActivo={handleToggleActivo}
        loading={loadingProductos}
        filtros={queryState}
        onFiltrosChange={handleFiltrosChange}
        onLimpiarFiltros={handleLimpiarFiltros}
        opciones={opciones}
        paginacion={paginacion}
        onPageChange={handlePageChange}
      />

      {/* Modal de edición de producto */}
      <Dialog open={editModalOpen} onOpenChange={(open) => {
        setEditModalOpen(open);
        if (!open) setProductoToEdit(null);
      }}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Producto</DialogTitle>
          </DialogHeader>
          <ProductoForm
            productoToEdit={productoToEdit}
            onSuccess={handleEditSuccess}
            onCancelEdit={() => {
              setEditModalOpen(false);
              setProductoToEdit(null);
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}