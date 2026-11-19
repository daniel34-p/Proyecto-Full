'use client';

import { useState, useEffect, useCallback } from 'react';
import { ProductosTable } from '@/components/productos-table';
import { InventoryStats } from '@/components/inventory-stats';
import { ProductoForm } from '@/components/producto-form';
import { ImportarExcel } from '@/components/importar-excel';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ArrowLeft, Building2, Download, Loader2 } from 'lucide-react';
import { exportarInventarioPorAgencia } from '@/lib/excel-export';

interface Producto {
  id: string;
  proveedor: string;
  referencia: string;
  producto: string;
  cantidad: number;
  cantidadDanada: number;
  unidades: string;
  seccion?: string;
  costo: string;
  costoReal: number;
  precioVenta: string;
  codigo: string;
  codigoBarras: string;
  embalaje?: string;
  anioInventario: number;
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
  cantidad: string;
}

interface ProductoARevisar {
  centroCosto: { id: string; nombre: string };
  productoId: string;
  campos: Array<'costo' | 'precioVenta'>;
  mensaje: string;
}

interface SucursalInventarioProps {
  centroCosto: { id: string; nombre: string };
  onVolver: () => void;
  // NUEVO: llega desde el botón "Revisar" de Alertas, vía
  // sucursales-view.tsx - abre directamente el producto indicado en el
  // modal de edición, con el campo correspondiente resaltado.
  productoARevisar?: ProductoARevisar | null;
  onProductoARevisarConsumido?: () => void;
}

export function SucursalInventario({
  centroCosto,
  onVolver,
  productoARevisar,
  onProductoARevisarConsumido,
}: SucursalInventarioProps) {
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
    cantidad: 'todos',
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
    proveedores: { nombre: string; totalProductos: number; valorTotal: number; valorDanado: number }[];
    departamentos: { nombre: string; totalProductos: number; valorTotal: number; valorDanado: number }[];
    granTotal: number;
    granTotalDanado: number;
  } | null>(null);

  const [productoToEdit, setProductoToEdit] = useState<Producto | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [exportando, setExportando] = useState(false);
  const [advertenciaCampos, setAdvertenciaCampos] = useState<{
    campos: Array<'costo' | 'precioVenta'>;
    mensaje: string;
  } | null>(null);

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
    if (q.cantidad !== 'todos') params.set('cantidad', q.cantidad);
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

  // Viene del botón "Revisar" de Alertas (vía sucursales-view.tsx): trae
  // el producto completo y abre el modal de edición de una vez, con el
  // campo correspondiente resaltado.
  useEffect(() => {
    if (!productoARevisar) return;

    let cancelado = false;
    (async () => {
      try {
        const response = await fetch(`/api/productos/${encodeURIComponent(productoARevisar.productoId)}`, {
          headers: authHeaders(),
        });
        if (cancelado) return;
        if (!response.ok) {
          alert('No se pudo cargar el producto. Puede que ya no exista.');
          return;
        }
        const producto = await response.json();
        if (cancelado) return;
        setProductoToEdit(producto);
        setAdvertenciaCampos({ campos: productoARevisar.campos, mensaje: productoARevisar.mensaje });
        setEditModalOpen(true);
      } catch (error) {
        console.error('Error al cargar producto desde alertas:', error);
      } finally {
        onProductoARevisarConsumido?.();
      }
    })();

    return () => {
      cancelado = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productoARevisar?.productoId]);

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

  const handleMarcarActualizado = async (id: string, actualizar: boolean) => {
    const anioActual = new Date().getFullYear();
    const mensaje = actualizar
      ? `¿Marcar este producto como actualizado en ${anioActual}? Volverá a contarse en el inventario.`
      : '¿Marcar este producto como pendiente? No se eliminará, pero dejará de contarse en el inventario hasta que se vuelva a actualizar.';
    if (!confirm(mensaje)) return;

    try {
      const response = await fetch(`/api/productos/${encodeURIComponent(id)}/estado`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ actualizar }),
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

  // Acción masiva al iniciar un nuevo conteo físico: deja en rojo todos los
  // productos en 0 de esta agencia, aunque ya estuvieran en verde por otro
  // motivo. Primero se consulta cuántos se van a afectar (para el confirm),
  // y solo después se ejecuta el update real.
  const handleMarcarPendientesMasivo = async () => {
    try {
      const countRes = await fetch(
        `/api/productos/marcar-pendientes-masivo?centroCostoId=${centroCosto.id}`,
        { headers: authHeaders() }
      );
      const countData = await countRes.json();
      if (!countRes.ok) {
        alert(countData.error || 'Error al consultar productos pendientes');
        return;
      }
      if (countData.count === 0) {
        alert('No hay productos con cantidad en 0 para marcar como pendientes en esta agencia.');
        return;
      }

      const anioActual = new Date().getFullYear();
      const confirmado = confirm(
        `Se marcarán ${countData.count} producto(s) con cantidad en 0 como pendientes de conteo ${anioActual}. ¿Continuar?`
      );
      if (!confirmado) return;

      const response = await fetch('/api/productos/marcar-pendientes-masivo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ centroCostoId: centroCosto.id }),
      });
      const data = await response.json();
      if (!response.ok) {
        alert(data.error || 'Error al marcar productos como pendientes');
        return;
      }

      await Promise.all([fetchProductos(queryState), fetchEstadisticas()]);
      alert(`${data.actualizados} producto(s) marcados como pendientes.`);
    } catch (error) {
      console.error('Error al marcar productos como pendientes:', error);
      alert('Error al marcar productos como pendientes');
    }
  };

  const handleEdit = (producto: Producto) => {
    setProductoToEdit(producto);
    setAdvertenciaCampos(null);
    setEditModalOpen(true);
  };

  const handleEditSuccess = async () => {
    await Promise.all([fetchProductos(queryState), fetchEstadisticas(), fetchOpciones()]);
    setEditModalOpen(false);
    setProductoToEdit(null);
    setAdvertenciaCampos(null);
  };

  const handleImportado = async () => {
    await Promise.all([fetchProductos(queryState), fetchEstadisticas(), fetchOpciones()]);
  };

  const handleExportar = async () => {
    setExportando(true);
    try {
      // Trae TODO el inventario vigente de esta sucursal (estado=activos ->
      // anioInventario === año actual), sin depender de los filtros que
      // tenga la tabla en pantalla en ese momento.
      const params = new URLSearchParams({
        page: '1',
        pageSize: '20000',
        centroCostoId: centroCosto.id,
        estado: 'activos',
      });
      const response = await fetch(`/api/productos?${params.toString()}`, {
        headers: authHeaders(),
      });
      if (!response.ok) {
        alert('Error al preparar la exportación');
        return;
      }
      const data = await response.json();
      if (!data.productos || data.productos.length === 0) {
        alert('No hay productos activos para exportar en esta sucursal');
        return;
      }
      exportarInventarioPorAgencia(data.productos, centroCosto.nombre, true);
    } catch (error) {
      console.error('Error al exportar inventario de la sucursal:', error);
      alert('Error al exportar productos');
    } finally {
      setExportando(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Encabezado de la sucursal */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
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
        <div className="flex items-center gap-2">
          <ImportarExcel
            centroCostoId={centroCosto.id}
            centroCostoNombre={centroCosto.nombre}
            onImportado={handleImportado}
          />
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportar}
            disabled={exportando}
            className="flex items-center gap-2"
          >
            {exportando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            {exportando ? 'Exportando...' : 'Exportar Inventario'}
          </Button>
        </div>
      </div>

      {/* Estadísticas de esta sucursal */}
      <InventoryStats estadisticas={estadisticas} loading={loadingStats} />

      {/* Tabla de productos de esta sucursal */}
      <ProductosTable
        productos={productos}
        onDelete={handleDelete}
        onEdit={handleEdit}
        onMarcarActualizado={handleMarcarActualizado}
        onMarcarPendientesMasivo={handleMarcarPendientesMasivo}
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
        if (!open) {
          setProductoToEdit(null);
          setAdvertenciaCampos(null);
        }
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
              setAdvertenciaCampos(null);
            }}
            camposConAdvertencia={advertenciaCampos}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}