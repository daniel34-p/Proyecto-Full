'use client';

import { useCallback, useEffect, useState } from 'react';
import { ProductoForm } from '@/components/producto-form';
import { ProductosTable } from '@/components/productos-table';
import { BarcodeScanner } from '@/components/barcode-scanner';
import { ScannedProductView } from '@/components/scanned-product-view';
import { CentroCostoMenu } from '@/components/centro-costo-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Camera, Building2, PackagePlus, List } from 'lucide-react';
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

type Modulo = 'registrar' | 'productos';

const MODULOS = [
  { id: 'registrar', label: 'Registrar Producto', icon: <PackagePlus className="h-4 w-4" /> },
  { id: 'productos', label: 'Ver Productos', icon: <List className="h-4 w-4" /> },
];

export function AsesorView() {
  const { user, logout, centrosCosto, centroCostoActivo, setCentroCostoActivo } = useAuth();
  const [modulo, setModulo] = useState<Modulo>('registrar');
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scannedProduct, setScannedProduct] = useState<Producto | null>(null);

  // Estado de la tabla de "Ver Productos" - reutiliza los mismos endpoints
  // ya existentes (/api/productos y /api/productos/filtros), sin agregar
  // ninguna consulta nueva a la base de datos.
  const [productos, setProductos] = useState<Producto[]>([]);
  const [paginacion, setPaginacion] = useState({ page: 1, pageSize: 50, total: 0, totalPages: 1 });
  const [queryState, setQueryState] = useState<QueryState>(QUERY_INICIAL);
  const [loadingProductos, setLoadingProductos] = useState(true);
  const [opciones, setOpciones] = useState({
    proveedores: [] as string[],
    unidades: [] as string[],
    secciones: [] as string[],
    creadores: [] as { id: string; nombre: string }[],
    centrosCosto: [] as { id: string; nombre: string }[],
  });
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

  // Solo se cargan datos de la tabla cuando el asesor realmente entra al
  // módulo "Ver Productos" - así el módulo de registro (el caso de uso más
  // frecuente) no paga el costo de esa consulta si nunca se visita.
  useEffect(() => {
    if (modulo !== 'productos') return;
    fetchProductos(queryState);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modulo, queryState, fetchProductos]);

  useEffect(() => {
    if (modulo !== 'productos') return;
    fetchOpciones();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modulo, fetchOpciones]);

  useEffect(() => {
    setQueryState(QUERY_INICIAL);
  }, [centroCostoActivo]);

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
      await fetchProductos(queryState);
      alert('Producto eliminado correctamente');
    } catch (error) {
      console.error('Error al eliminar producto:', error);
      alert('Error al eliminar producto');
    }
  };

  const handleEdit = (producto: Producto) => {
    setProductoToEdit(producto);
    setEditModalOpen(true);
  };

  const handleEditSuccess = async () => {
    await Promise.all([fetchProductos(queryState), fetchOpciones()]);
    setEditModalOpen(false);
    setProductoToEdit(null);
  };

  const handleSuccess = () => {
    setShowSuccessMessage(true);
    setTimeout(() => setShowSuccessMessage(false), 3000);
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
                modulos={MODULOS}
                moduloActivo={modulo}
                onSeleccionarModulo={(id) => setModulo(id as Modulo)}
              />
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Sistema de Inventario</h1>
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
            <div className="flex gap-2 w-full sm:w-auto">
              <Button
                variant="outline"
                onClick={() => setScannerOpen(true)}
                className="flex items-center gap-2 flex-1 sm:flex-none"
                size="sm"
              >
                <Camera className="h-4 w-4" />
                <span>Escanear</span>
              </Button>
              <Button variant="outline" onClick={() => logout()} size="sm" className="flex-1 sm:flex-none">
                <span className="hidden sm:inline">Cerrar Sesión</span>
                <span className="sm:hidden">Salir</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {modulo === 'registrar' ? (
        <main className="max-w-2xl mx-auto p-4 sm:p-6 lg:p-8">
          {showSuccessMessage && (
            <Card className="mb-4 sm:mb-6 border-green-200 bg-green-50">
              <CardContent className="pt-6">
                <p className="text-green-800 font-medium text-center text-sm sm:text-base">
                  ✅ Producto registrado exitosamente
                </p>
              </CardContent>
            </Card>
          )}

          <ProductoForm
            key={centroCostoActivo?.id}
            onSuccess={handleSuccess}
            mostrarBusqueda={true}
            centroCostoId={centroCostoActivo?.id}
            centroCostoNombre={centroCostoActivo?.nombre}
          />

          <Card className="mt-4 sm:mt-6">
            <CardHeader>
              <CardTitle className="text-base sm:text-lg">Instrucciones</CardTitle>
            </CardHeader>
            <CardContent className="text-xs sm:text-sm text-gray-600 space-y-2">
              <p>• Completa todos los campos marcados con *</p>
              <p>• El código debe ser único para cada producto</p>
              <p>• El costo debe ingresarse en formato de código (solo letras)</p>
              <p>• Verifica los datos antes de guardar</p>
              {centroCostoActivo && (
                <p className={`font-medium mt-3 flex items-center gap-2 ${getCentroCostoColor(centroCostoActivo.nombre).text}`}>
                  <Building2 className="h-4 w-4" />
                  Los productos se registrarán en: {centroCostoActivo.nombre}
                </p>
              )}
            </CardContent>
          </Card>
        </main>
      ) : (
        <main className="p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">
            <ProductosTable
              productos={productos}
              onDelete={handleDelete}
              onEdit={handleEdit}
              onMarcarActualizado={() => {}}
              loading={loadingProductos}
              filtros={queryState}
              onFiltrosChange={handleFiltrosChange}
              onLimpiarFiltros={handleLimpiarFiltros}
              opciones={opciones}
              paginacion={paginacion}
              onPageChange={handlePageChange}
            />
          </div>
        </main>
      )}

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
        onUpdate={() => setScannedProduct(null)}
      />
    </div>
  );
}
