'use client';

import { useState, useEffect } from 'react';
import { ProductoForm } from '@/components/producto-form';
import { ProductosTable } from '@/components/productos-table';
import { InventoryStats } from '@/components/inventory-stats';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { BarcodeScanner } from '@/components/barcode-scanner';
import { ScannedProductView } from '@/components/scanned-product-view';
import { Camera, Download, Building2 } from 'lucide-react';
import { exportarProductosAExcel } from '@/lib/excel-export';
import { getCentroCostoColor } from '@/lib/centro-costo-colors';

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

export function AdminView() {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(true);
  const [productoToEdit, setProductoToEdit] = useState<Producto | null>(null);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scannedProduct, setScannedProduct] = useState<Producto | null>(null);
  const { user, logout, centroCosto } = useAuth();

  const fetchProductos = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/productos', {
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          logout();
          return;
        }
        throw new Error('Error al cargar productos');
      }

      const data = await response.json();
      setProductos(data);
    } catch (error) {
      console.error('Error al cargar productos:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProductos();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar este producto?')) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/productos/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        alert(errorData.error || 'Error al eliminar producto');
        return;
      }

      await fetchProductos();
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

  const handleSuccess = () => {
    fetchProductos();
    setProductoToEdit(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-lg">Cargando...</p>
      </div>
    );
  }

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
                onClick={() => exportarProductosAExcel(productos, true)}
                className="flex items-center gap-2 flex-1 sm:flex-none"
                disabled={productos.length === 0}
                size="sm"
              >
                <Download className="h-4 w-4" />
                <span className="hidden sm:inline">Exportar</span>
                <span className="sm:hidden">Excel</span>
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
          <InventoryStats productos={productos} />

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
        onUpdate={fetchProductos}
      />
    </div>
  );
}