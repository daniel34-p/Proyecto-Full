'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { ProductoForm } from '@/components/producto-form';
import { ProductosTable } from '@/components/productos-table';
import { InventoryStats } from '@/components/inventory-stats';
import { CentroCostoMenu } from '@/components/centro-costo-menu';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { BarcodeScanner } from '@/components/barcode-scanner';
import { ScannedProductView } from '@/components/scanned-product-view';
import { ImportarExcel } from '@/components/importar-excel';
import { HistorialAlertasView, AlertaHistorial } from '@/components/historial-alertas-view';
import { MovimientosInventarioView, Movimiento } from '@/components/movimientos-inventario-view';
import { Camera, Download, Building2, Loader2, Package, History, ArrowUpDown } from 'lucide-react';
import { exportarInventarioPorAgencia } from '@/lib/excel-export';
import { getCentroCostoColor } from '@/lib/centro-costo-colors';
import { useAlertasPendientes } from '@/lib/use-alertas-pendientes';
import { useMovimientosPendientes } from '@/lib/use-movimientos-pendientes';

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
  centroCosto?: { id: string; nombre: string };
  creadoPor?: { nombre: string; email: string; rol: string };
  editadoPor?: { nombre: string; email: string; rol: string };
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

const QUERY_INICIAL: QueryState = {
  page: 1,
  pageSize: 50,
  search: '',
  proveedor: 'todos',
  unidades: 'todos',
  seccion: 'todos',
  creadoPorId: 'todos',
  centroCostoId: 'todos',
  estado: 'todos',
};

export function AdminView() {
  const [vistaActiva, setVistaActiva] = useState<'productos' | 'alertas' | 'movimientos'>('productos');
  const [productos, setProductos] = useState<Producto[]>([]);
  const [paginacion, setPaginacion] = useState({ page: 1, pageSize: 50, total: 0, totalPages: 1 });
  const [queryState, setQueryState] = useState<QueryState>(QUERY_INICIAL);
  const [loadingProductos, setLoadingProductos] = useState(true);
  const [loadingStats, setLoadingStats] = useState(true);
  const [exportando, setExportando] = useState(false);

  const [opciones, setOpciones] = useState({
    proveedores: [] as string[],
    unidades: [] as string[],
    secciones: [] as string[],
    creadores: [] as { id: string; nombre: string }[],
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
  // NUEVO: llega desde el botón "Revisar" del Historial - qué campo(s)
  // resaltar en el formulario y con qué mensaje (ver producto-form.tsx).
  const [advertenciaCampos, setAdvertenciaCampos] = useState<{
    campos: Array<'costo' | 'precioVenta'>;
    mensaje: string;
  } | null>(null);
  const formRef = useRef<HTMLDivElement>(null);
  const tableRef = useRef<HTMLDivElement>(null);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scannedProduct, setScannedProduct] = useState<Producto | null>(null);
  const { user, logout, centrosCosto, centroCostoActivo, setCentroCostoActivo } = useAuth();
  const alertasPendientes = useAlertasPendientes();
  const movimientosPendientes = useMovimientosPendientes();

  const authHeaders = () => {
    const token = localStorage.getItem('token');
    return { Authorization: token ? `Bearer ${token}` : '' };
  };

  // El centro activo (del menú hamburguesa) siempre viaja explícito en cada
  // consulta - así cada módulo/centro se ve como un inventario propio.
  const buildQueryString = (q: QueryState) => {
    const params = new URLSearchParams();
    params.set('page', String(q.page));
    params.set('pageSize', String(q.pageSize));
    if (centroCostoActivo) params.set('centroCostoId', centroCostoActivo.id);
    if (q.search) params.set('search', q.search);
    if (q.proveedor !== 'todos') params.set('proveedor', q.proveedor);
    if (q.unidades !== 'todos') params.set('unidades', q.unidades);
    if (q.seccion !== 'todos') params.set('seccion', q.seccion);
    if (q.creadoPorId !== 'todos') params.set('creadoPorId', q.creadoPorId);
    if (q.estado !== 'todos') params.set('estado', q.estado);
    return params.toString();
  };

  const fetchProductos = useCallback(async (q: QueryState) => {
    if (!centroCostoActivo) return;
    setLoadingProductos(true);
    try {
      const response = await fetch(`/api/productos?${buildQueryString(q)}`, {
        headers: authHeaders(),
      });

      if (!response.ok) {
        if (response.status === 401) {
          logout();
          return;
        }
        throw new Error('Error al cargar productos');
      }

      const data = await response.json();
      setProductos(data.productos);
      setPaginacion(data.pagination);
    } catch (error) {
      console.error('Error al cargar productos:', error);
    } finally {
      setLoadingProductos(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [centroCostoActivo]);

  const fetchOpciones = useCallback(async () => {
    if (!centroCostoActivo) return;
    try {
      const response = await fetch(`/api/productos/filtros?centroCostoId=${centroCostoActivo.id}`, {
        headers: authHeaders(),
      });
      if (!response.ok) return;
      const data = await response.json();
      setOpciones((prev) => ({ ...prev, ...data }));
    } catch (error) {
      console.error('Error al cargar opciones de filtro:', error);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [centroCostoActivo]);

  const fetchEstadisticas = useCallback(async () => {
    if (!centroCostoActivo) return;
    setLoadingStats(true);
    try {
      const response = await fetch(`/api/productos/estadisticas?centroCostoId=${centroCostoActivo.id}`, {
        headers: authHeaders(),
      });
      if (!response.ok) return;
      const data = await response.json();
      setEstadisticas(data);
    } catch (error) {
      console.error('Error al cargar estadísticas:', error);
    } finally {
      setLoadingStats(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [centroCostoActivo]);

  // Al cambiar el centro activo (menú hamburguesa) se recarga todo, como si
  // se entrara a un módulo/inventario distinto
  useEffect(() => {
    setQueryState(QUERY_INICIAL);
    setProductoToEdit(null);
  }, [centroCostoActivo]);

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

  const handleLimpiarFiltros = () => setQueryState(QUERY_INICIAL);
  const handlePageChange = (page: number) => setQueryState((prev) => ({ ...prev, page }));

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
      alert('Producto eliminado correctamente');
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
  // productos en 0 de la agencia activa, aunque ya estuvieran en verde por
  // otro motivo. Primero se consulta cuántos se van a afectar (para el
  // confirm), y solo después se ejecuta el update real.
  const handleMarcarPendientesMasivo = async () => {
    if (!centroCostoActivo) return;
    try {
      const countRes = await fetch(
        `/api/productos/marcar-pendientes-masivo?centroCostoId=${centroCostoActivo.id}`,
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
        body: JSON.stringify({ centroCostoId: centroCostoActivo.id }),
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
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleCancelEdit = () => {
    setProductoToEdit(null);
    setAdvertenciaCampos(null);
    tableRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleSuccess = async () => {
    const estabaEditando = !!productoToEdit;
    await Promise.all([fetchProductos(queryState), fetchEstadisticas(), fetchOpciones()]);
    setProductoToEdit(null);
    setAdvertenciaCampos(null);
    if (estabaEditando) {
      tableRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Viene del botón "Revisar" de Alertas: trae el producto completo (la
  // alerta solo guarda un resumen liviano) y abre el mismo formulario de
  // edición de siempre, con el campo correspondiente resaltado.
  const handleRevisarDesdeHistorial = async (alerta: AlertaHistorial) => {
    if (!alerta.producto) return;
    try {
      const response = await fetch(`/api/productos/${encodeURIComponent(alerta.producto.id)}`, {
        headers: authHeaders(),
      });
      if (!response.ok) {
        alert('No se pudo cargar el producto. Puede que ya no exista.');
        return;
      }
      const producto = await response.json();
      setVistaActiva('productos');
      setProductoToEdit(producto);
      setAdvertenciaCampos({
        campos: ['costo', 'precioVenta'],
        mensaje: 'El precio de venta quedó por debajo del costo. Revisa ambos valores.',
      });
      setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
    } catch (error) {
      console.error('Error al cargar producto desde alertas:', error);
      alert('Error al cargar el producto');
    }
  };

  // Viene del botón "Revisar" de Movimientos: igual patrón que Alertas,
  // pero resaltando solo el campo "costo" - no hay nada que "corregir",
  // es solo para que el administrador confirme que el cambio es correcto.
  const handleRevisarDesdeMovimiento = async (movimiento: Movimiento) => {
    if (!movimiento.productoId) return;
    try {
      const response = await fetch(`/api/productos/${encodeURIComponent(movimiento.productoId)}`, {
        headers: authHeaders(),
      });
      if (!response.ok) {
        alert('No se pudo cargar el producto. Puede que ya no exista.');
        return;
      }
      const producto = await response.json();
      setVistaActiva('productos');
      setProductoToEdit(producto);
      setAdvertenciaCampos({
        campos: ['costo'],
        mensaje: 'Este producto tuvo un cambio de costo registrado en Movimientos. Verifica que esté correcto.',
      });
      setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
    } catch (error) {
      console.error('Error al cargar producto desde movimientos:', error);
      alert('Error al cargar el producto');
    }
  };

  const handleExportar = async () => {
    setExportando(true);
    try {
      // La exportación siempre trae TODO el inventario vigente de la
      // agencia activa (estado=activos -> anioInventario === año actual),
      // sin depender de los filtros de búsqueda/proveedor/etc. que tenga
      // la tabla en pantalla en ese momento.
      const q: QueryState = {
        ...QUERY_INICIAL,
        page: 1,
        pageSize: 20000,
        estado: 'activos',
      };
      const response = await fetch(`/api/productos?${buildQueryString(q)}`, {
        headers: authHeaders(),
      });
      if (!response.ok) {
        alert('Error al preparar la exportación');
        return;
      }
      const data = await response.json();
      if (!data.productos || data.productos.length === 0) {
        alert('No hay productos activos para exportar en esta agencia');
        return;
      }
      exportarInventarioPorAgencia(
        data.productos,
        centroCostoActivo?.nombre || 'inventario',
        true
      );
    } catch (error) {
      console.error('Error al exportar:', error);
      alert('Error al exportar productos');
    } finally {
      setExportando(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div className="flex items-center gap-2">
              <CentroCostoMenu
                centros={centrosCosto}
                centroActivo={centroCostoActivo}
                onSeleccionar={setCentroCostoActivo}
              />
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
                  Panel de Administración
                </h1>
                <div className="flex items-center gap-2 mt-1">
                  <p className="text-xs sm:text-sm text-gray-600">Bienvenido, {user?.nombre}</p>
                  {centroCostoActivo && (
                    <div
                      className={`flex items-center gap-1 px-2 py-1 rounded-md border ${getCentroCostoColor(centroCostoActivo.nombre).bg} ${getCentroCostoColor(centroCostoActivo.nombre).text} ${getCentroCostoColor(centroCostoActivo.nombre).border}`}
                    >
                      <Building2 className="h-3 w-3" />
                      <span className="text-xs font-medium">{centroCostoActivo.nombre}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 w-full sm:w-auto items-center">
              <div className="flex items-center gap-1 bg-gray-100 rounded-md p-1">
                <Button
                  variant={vistaActiva === 'productos' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setVistaActiva('productos')}
                  className="flex items-center gap-2"
                >
                  <Package className="h-4 w-4" />
                  <span className="hidden sm:inline">Productos</span>
                </Button>
                <div className="relative">
                  <Button
                    variant={vistaActiva === 'alertas' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setVistaActiva('alertas')}
                    className="flex items-center gap-2"
                  >
                    <History className="h-4 w-4" />
                    <span className="hidden sm:inline">Alertas</span>
                  </Button>
                  {alertasPendientes > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 h-5 min-w-5 px-1 rounded-full bg-red-500 text-white text-[11px] font-semibold flex items-center justify-center pointer-events-none">
                      {alertasPendientes > 99 ? '99+' : alertasPendientes}
                    </span>
                  )}
                </div>
                <div className="relative">
                  <Button
                    variant={vistaActiva === 'movimientos' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setVistaActiva('movimientos')}
                    className="flex items-center gap-2"
                  >
                    <ArrowUpDown className="h-4 w-4" />
                    <span className="hidden sm:inline">Movimientos</span>
                  </Button>
                  {movimientosPendientes > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 h-5 min-w-5 px-1 rounded-full bg-red-500 text-white text-[11px] font-semibold flex items-center justify-center pointer-events-none">
                      {movimientosPendientes > 99 ? '99+' : movimientosPendientes}
                    </span>
                  )}
                </div>
              </div>

              {vistaActiva === 'productos' && (
                <>
                  <Button
                    variant="outline"
                    onClick={handleExportar}
                    className="flex items-center gap-2 flex-1 sm:flex-none"
                    disabled={paginacion.total === 0 || exportando}
                    size="sm"
                  >
                    {exportando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                    <span className="hidden sm:inline">{exportando ? 'Exportando...' : 'Exportar'}</span>
                    <span className="sm:hidden">{exportando ? '...' : 'Excel'}</span>
                  </Button>
                  {centroCostoActivo && (
                    <ImportarExcel
                      centroCostoId={centroCostoActivo.id}
                      centroCostoNombre={centroCostoActivo.nombre}
                      onImportado={handleSuccess}
                    />
                  )}
                  <Button
                    variant="outline"
                    onClick={() => setScannerOpen(true)}
                    className="flex items-center gap-2 flex-1 sm:flex-none"
                    size="sm"
                  >
                    <Camera className="h-4 w-4" />
                    <span className="hidden sm:inline">Escanear</span>
                    <span className="sm:hidden">Scan</span>
                  </Button>
                </>
              )}

              <Button variant="outline" onClick={() => logout()} size="sm" className="flex-1 sm:flex-none">
                <span className="hidden sm:inline">Cerrar Sesión</span>
                <span className="sm:hidden">Salir</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="p-4 sm:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8">
          {vistaActiva === 'alertas' ? (
            <HistorialAlertasView onRevisarProducto={handleRevisarDesdeHistorial} />
          ) : vistaActiva === 'movimientos' ? (
            <MovimientosInventarioView onRevisarProducto={handleRevisarDesdeMovimiento} />
          ) : (
            <>
              <InventoryStats estadisticas={estadisticas} loading={loadingStats} />

              <div ref={tableRef}>
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
              </div>

              <div ref={formRef} className="max-w-2xl mx-auto w-full">
                <ProductoForm
                  onSuccess={handleSuccess}
                  productoToEdit={productoToEdit}
                  onCancelEdit={handleCancelEdit}
                  centroCostoId={centroCostoActivo?.id}
                  centroCostoNombre={centroCostoActivo?.nombre}
                  camposConAdvertencia={advertenciaCampos}
                />
              </div>
            </>
          )}
        </div>
      </main>

      <BarcodeScanner
        isOpen={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onProductFound={(producto) => {
          setScannedProduct(producto);
          setScannerOpen(false);
        }}
      />

      <ScannedProductView
        producto={scannedProduct}
        isOpen={!!scannedProduct}
        onClose={() => setScannedProduct(null)}
        onUpdate={() => {
          fetchProductos(queryState);
          fetchEstadisticas();
        }}
      />
    </div>
  );
}