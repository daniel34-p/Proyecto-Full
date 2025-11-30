'use client';

import { useState, useEffect } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Loader2, Camera, X, Smartphone } from 'lucide-react';

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

interface BarcodeScannerProps {
  isOpen: boolean;
  onClose: () => void;
  onProductFound: (producto: Producto) => void;
}

export function BarcodeScanner({ isOpen, onClose, onProductFound }: BarcodeScannerProps) {
  const [scanner, setScanner] = useState<Html5Qrcode | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState('');
  const [cameraReady, setCameraReady] = useState(false);

useEffect(() => {
  if (isOpen && !scanner && !isScanning) {
    // Esperar a que el elemento esté disponible en el DOM
    const timer = setTimeout(() => {
      initCamera();
    }, 300);

    return () => clearTimeout(timer);
  }

  return () => {
    if (!isOpen) {
      stopCamera();
    }
  };
}, [isOpen]);

const initCamera = async () => {
  try {
    setError('');
    
    // Verificar si el elemento existe
    const readerElement = document.getElementById('reader');
    if (!readerElement) {
      setError('Error: Elemento del escáner no encontrado');
      return;
    }

    const html5Qrcode = new Html5Qrcode('reader');
    
    // Intentar obtener cámaras
    let cameras;
    try {
      cameras = await Html5Qrcode.getCameras();
    } catch (err: any) {
      console.error('Error al obtener cámaras:', err);
      setError('No se pudo acceder a las cámaras. Verifica los permisos del navegador.');
      return;
    }

    if (!cameras || cameras.length === 0) {
      setError('No se encontraron cámaras disponibles en tu dispositivo');
      return;
    }

    // Preferir cámara trasera en móviles
    const backCamera = cameras.find(camera => 
      camera.label.toLowerCase().includes('back') || 
      camera.label.toLowerCase().includes('rear') ||
      camera.label.toLowerCase().includes('trasera')
    );
    const cameraId = backCamera ? backCamera.id : cameras[cameras.length - 1].id;

    console.log('🎥 Iniciando cámara:', cameraId);

    // Iniciar escaneo con configuración más permisiva
    try {
      await html5Qrcode.start(
        cameraId,
        {
          fps: 10,
          qrbox: { width: 250, height: 150 },
        },
        onScanSuccess,
        onScanError
      );

      setScanner(html5Qrcode);
      setIsScanning(true);
      setCameraReady(true);
      console.log('✅ Cámara iniciada correctamente');
    } catch (err: any) {
      console.error('Error al iniciar cámara:', err);
      
      if (err.name === 'NotAllowedError') {
        setError('Permiso de cámara denegado. Por favor, permite el acceso a la cámara en tu navegador.');
      } else if (err.name === 'NotFoundError') {
        setError('No se encontró ninguna cámara en tu dispositivo.');
      } else if (err.name === 'NotReadableError') {
        setError('La cámara está siendo usada por otra aplicación. Cierra otras apps que usen la cámara.');
      } else {
        setError(`Error al iniciar cámara: ${err.message || 'Error desconocido'}`);
      }
    }
  } catch (err: any) {
    console.error('Error general:', err);
    setError('Error inesperado al iniciar el escáner');
  }
};

  const stopCamera = async () => {
    if (scanner && isScanning) {
      try {
        await scanner.stop();
        scanner.clear();
      } catch (err) {
        console.error('Error al detener cámara:', err);
      }
    }
    setScanner(null);
    setIsScanning(false);
    setCameraReady(false);
  };

  const onScanSuccess = async (decodedText: string) => {
    console.log('📷 Código escaneado:', decodedText);
    
    // Detener el escáner
    await stopCamera();

    // Buscar producto por código de barras
    await buscarProducto(decodedText);
  };

  const onScanError = (errorMessage: string) => {
    // Ignorar errores continuos de escaneo
  };

  const buscarProducto = async (codigoBarras: string) => {
    try {
      const response = await fetch(`/api/productos/buscar?codigoBarras=${codigoBarras}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        setError(errorData.error || 'Producto no encontrado');
        
        // Reiniciar cámara después de 2 segundos
        setTimeout(() => {
          setError('');
          initCamera();
        }, 2000);
        return;
      }

      const producto = await response.json();
      onProductFound(producto);
      onClose();
    } catch (err) {
      setError('Error al buscar producto');
      
      // Reiniciar cámara después de 2 segundos
      setTimeout(() => {
        setError('');
        initCamera();
      }, 2000);
    }
  };

const handleClose = async () => {
  await stopCamera();
  setError('');
  setCameraReady(false);
  onClose();
};

  return (
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-lg max-w-[95vw]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            Escanear Código de Barras
          </DialogTitle>
          <DialogDescription>
            Apunta la cámara al código de barras del producto
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Visor del escáner */}
          <div className="relative">
            <div id="reader" className="w-full rounded-md overflow-hidden"></div>
            
            {!cameraReady && !error && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded-md">
                <div className="text-center">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-gray-400" />
                  <p className="text-sm text-gray-600">Iniciando cámara...</p>
                </div>
              </div>
            )}
          </div>

          {/* Instrucciones */}
          {cameraReady && !error && (
            <div className="bg-blue-50 p-3 rounded-md">
              <div className="flex gap-2 text-sm text-blue-800">
                <Smartphone className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium">Consejo:</p>
                  <p className="text-xs">Mantén el código de barras dentro del recuadro y a una distancia de 10-20 cm</p>
                </div>
              </div>
            </div>
          )}

          {/* Mensaje de error */}
          {error && (
            <div className="p-3 text-sm text-red-500 bg-red-50 rounded-md border border-red-200">
              {error}
            </div>
          )}

          {/* Botón de cerrar */}
          <Button variant="outline" onClick={handleClose} className="w-full">
            <X className="h-4 w-4 mr-2" />
            Cancelar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}