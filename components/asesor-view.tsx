'use client';

import { useState } from 'react';
import { ProductoForm } from '@/components/producto-form';
import { BarcodeScanner } from '@/components/barcode-scanner';
import { ScannedProductView } from '@/components/scanned-product-view';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Camera, Building2 } from 'lucide-react';
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

export function AsesorView() {
  const { user, logout, centroCosto } = useAuth();
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scannedProduct, setScannedProduct] = useState<Producto | null>(null);

  const handleSuccess = () => {
    setShowSuccessMessage(true);
    setTimeout(() => {
      setShowSuccessMessage(false);
    }, 3000);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
                Sistema de Inventario
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

        <ProductoForm onSuccess={handleSuccess} mostrarBusqueda={true} />

        <Card className="mt-4 sm:mt-6">
          <CardHeader>
            <CardTitle className="text-base sm:text-lg">Instrucciones</CardTitle>
          </CardHeader>
          <CardContent className="text-xs sm:text-sm text-gray-600 space-y-2">
            <p>• Completa todos los campos marcados con *</p>
            <p>• El código debe ser único para cada producto</p>
            <p>• El costo debe ingresarse en formato de código (solo letras)</p>
            <p>• Verifica los datos antes de guardar</p>
            {centroCosto && (
              <p className={`font-medium mt-3 flex items-center gap-2 ${getCentroCostoColor(centroCosto.nombre).text}`}>
                <Building2 className="h-4 w-4" />
                Los productos se registrarán en: {centroCosto.nombre}
              </p>
            )}
          </CardContent>
        </Card>
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
          setScannedProduct(null);
        }}
      />
    </div>
  );
}