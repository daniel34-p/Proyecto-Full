'use client';

import { useState, useEffect, useCallback } from 'react';
import { ProductoForm } from '@/components/producto-form';
import { ProductosTable } from '@/components/productos-table';
import { InventoryStats } from '@/components/inventory-stats';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { BarcodeScanner } from '@/components/barcode-scanner';
import { ScannedProductView } from '@/components/scanned-product-view';
import { Camera, Download, Building2, Loader2 } from 'lucide-react';
import { exportarProductosAExcel } from '@/lib/excel-export';
import { getCentroCostoColor } from '@/lib/centro-costo-colors';

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
};

export function AdminView() {
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
    proveedores: { nombre: string; totalProductos: number; valorTotal: number }[];
    granTotal: number;
  } | null>(null);

  const [productoToEdit, setProductoToEdit] = useState<Producto | null>(null);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scannedProduct, setScannedProduct] = useState<Producto | null>(null);
  const { user, logout, centroCosto } = useAuth();

  const authHeaders = () => {
    const token = localStorage.getItem('token');
    return { 'Authorization': token ? `Bearer ${token}` : '' };
  };

  const buildQueryString = (q: QueryState) => {
    const params = new URLSearchParams();
    params.set('page', String(q.page));
    params.set('pageSize', String(q.pageSize));
    if (q.search) params.set('search', q.search);
    if (q.proveedor !== 'todos') params.set('proveedor', q.proveedor);
    if (q.unidades !== 'todos') params.set('unidades', q.unidades);
    if (q.seccion !== 'todos') params.set('seccion', q.seccion);
    if (q.creadoPorId !== 'todos') params.set('creadoPorId', q.creadoPorId);
    if (q.centroCostoId !== 'todos') params.set('centroCostoId', q.centroCostoId);
    return params.toString();
  };

  const fetchProductos = useCallback(async (q: QueryState) => {
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
  }, []);

  const fetchOpciones = useCallback(async () => {
    try {
      const response = await fetch('/api/productos/filtros', { headers: authHeaders() });
      if (!response.ok) return;
      const data = await response.json();
      setOpciones((prev) => ({ ...prev, ...data }));
    } catch (error) {
      console.error('Error al cargar opciones de filtro:', error);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchEstadisticas = useCallback(async () => {
    setLoadingStats(true);
    try {
      const response = await fetch('/api/productos/estadisticas', { headers: authHeaders() });
      if (!response.ok) return;
      const data = await response.json();
      setEstadisticas(data);
    } catch (error) {
      console.error('Error al cargar estadísticas:', error);
    } finally {
      setLoadingStats(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Cargar productos cada vez que cambian filtros/página
  useEffect(() => {
    fetchProductos(queryState);
  }, [queryState, fetchProductos]);

  // Cargar opciones de filtro y estadísticas una sola vez al montar
  useEffect(() => {
    fetchOpciones();
    fetchEstadisticas();
  }, [fetchOpciones, fetchEstadisticas]);

  const handleFiltrosChange = (parcial: Partial<QueryState>) => {
    setQueryState((prev) => ({ ...prev, ...parcial, page: 1 }));
  };

  const handleLimpiarFiltros = () => {
    setQueryState(QUERY_INICIAL);
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

      // Recargamos solo la página actual (rápido) y las estadísticas
      await Promise.all([fetchProductos(queryState), fetchEstadisticas()]);
      alert('Producto eliminado correctamente');
    } catch (error) {
      console.error('Error al eliminar producto:', error);
      alert('Error al eliminar producto');
    }
  };

  const handleEdit = (producto: Producto) => {
    setProductoToEdit(producto);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setProductoToEdit(null);
  };

  const handleSuccess = async () => {
    // Recargamos solo la página/filtro actual, no todo el catálogo
    await Promise.all([fetchProductos(queryState), fetchEstadisticas(), fetchOpciones()]);
    setProductoToEdit(null);
  };

  const handleExportar = async () => {
    setExportando(true);
    try {
      // Para exportar sí necesitamos todos los productos que cumplen el
      // filtro actual (no solo la página visible), pero es una acción
      // explícita del usuario, no algo que ocurra en cada carga de pantalla.
      const q = { ...queryState, page: 1, pageSize: Math.max(paginacion.total, 1) };
      const response = await fetch(`/api/productos?${buildQueryString(q)}`, {
        headers: authHeaders(),
      });

      if (!response.ok) {
        alert('Error al preparar la exportación');
        return;
      }

      const data = await response.json();
      exportarProductosAExcel(data.productos, true);
    } catch (error) {
      console.error('Error al exportar:', error);
      alert('Error al exportar productos');
    } finally {
      setExportando(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
                Panel de Administración
              </h1>
              <div className="flex items-center gap-2 mt-1">
                <p className="text-xs sm:text-sm text-gray-600">
                  Bienvenido, {user?.nombre}
                </p>
                {centroCosto && (
                  <div 
                    className={`flex items-center gap-1 px-2 py-1 rounded-md border ${getCentroCostoColor(centroCosto.nombre).bg} ${getCentroCostoColor(centroCosto.nombre).text} ${getCentroCostoColor(centroCosto.nombre).border}`}
                  >
                    <Building2 className="h-3 w-3" />
                    <span className="text-xs font-medium">
                      {centroCosto.nombre}
                    </span>
                  </div>
                )}
              </div>
            </div>
            <div className="flex flex-wrap gap-2 w-full sm:w-auto">
              <Button
                variant="outline"
                onClick={handleExportar}
                className="flex items-center gap-2 flex-1 sm:flex-none"
                disabled={paginacion.total === 0 || exportando}
                size="sm"
              >
                {exportando ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                <span className="hidden sm:inline">{exportando ? 'Exportando...' : 'Exportar'}</span>
                <span className="sm:hidden">{exportando ? '...' : 'Excel'}</span>
              </Button>
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
              <Button 
                variant="outline" 
                onClick={logout}
                size="sm"
                className="flex-1 sm:flex-none"
              >
                <span className="hidden sm:inline">Cerrar Sesión</span>
                <span className="sm:hidden">Salir</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Contenido */}
      <main className="p-4 sm:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8">
          {/* Estadísticas */}
          <InventoryStats estadisticas={estadisticas} loading={loadingStats} />

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 sm:gap-8">
            {/* Formulario */}
            <div className="xl:col-span-1 order-2 xl:order-1">
              <ProductoForm
                onSuccess={handleSuccess}
                productoToEdit={productoToEdit}
                onCancelEdit={handleCancelEdit}
              />
            </div>

            {/* Tabla */}
            <div className="xl:col-span-2 order-1 xl:order-2">
              <ProductosTable
                productos={productos}
                onDelete={handleDelete}
                onEdit={handleEdit}
                loading={loadingProductos}
                filtros={queryState}
                onFiltrosChange={handleFiltrosChange}
                onLimpiarFiltros={handleLimpiarFiltros}
                opciones={opciones}
                paginacion={paginacion}
                onPageChange={handlePageChange}
              />
            </div>
          </div>
        </div>
      </main>

      {/* Escáner de código de barras */}
      <BarcodeScanner
        isOpen={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onProductFound={(producto) => {
          setScannedProduct(producto);
          setScannerOpen(false);
        }}
      />

      {/* Vista de producto escaneado */}
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