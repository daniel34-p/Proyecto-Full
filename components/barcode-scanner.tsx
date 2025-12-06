'use client';

import { useState, useEffect, useRef } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Loader2, Camera, X, Smartphone, AlertCircle } from 'lucide-react';

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
  const [scanAttempts, setScanAttempts] = useState(0);

  const readerRef = useRef<HTMLDivElement | null>(null);
  const isInitializing = useRef(false);

  useEffect(() => {
    if (isOpen && !scanner && !isScanning && !isInitializing.current) {
      const timer = setTimeout(() => {
        initCamera();
      }, 400);
      return () => clearTimeout(timer);
    }

    return () => {
      if (!isOpen) {
        stopCamera();
      }
    };
  }, [isOpen]);

  const initCamera = async () => {
    if (isInitializing.current) return;
    
    try {
      isInitializing.current = true;
      setError('');
      setCameraReady(false);

      const readerElement = document.getElementById('reader');
      if (!readerElement) {
        setError('Error: Elemento del escáner no encontrado');
        isInitializing.current = false;
        return;
      }

      // Crear instancia con formatos específicos para códigos de barras
      const html5Qrcode = new Html5Qrcode('reader', {
        formatsToSupport: [
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.CODE_39,
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.UPC_A,
          Html5QrcodeSupportedFormats.UPC_E,
        ],
        verbose: false,
      });

      // Obtener cámaras disponibles
      let cameras;
      try {
        cameras = await Html5Qrcode.getCameras();
      } catch (err) {
        console.error('Error obteniendo cámaras:', err);
        setError('No se puede acceder a la cámara. Verifica los permisos.');
        isInitializing.current = false;
        return;
      }

      if (!cameras || cameras.length === 0) {
        setError('No se encontraron cámaras en tu dispositivo');
        isInitializing.current = false;
        return;
      }

      // Seleccionar cámara trasera
      const backCamera = cameras.find(camera => {
        const label = camera.label.toLowerCase();
        return label.includes('back') || 
               label.includes('rear') || 
               label.includes('trasera') ||
               label.includes('environment');
      });

      const cameraId = backCamera ? backCamera.id : cameras[cameras.length - 1].id;

      console.log('📷 Iniciando cámara:', backCamera?.label || cameras[cameras.length - 1].label);

      // Configuración optimizada para códigos de barras
      await html5Qrcode.start(
        cameraId,
        {
          fps: 20, // Reducido para mejor estabilidad
          qrbox: function(viewfinderWidth, viewfinderHeight) {
            // Área rectangular horizontal para códigos de barras
            const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
            const qrboxWidth = Math.floor(minEdge * 0.8);
            const qrboxHeight = Math.floor(minEdge * 0.4);
            return {
              width: qrboxWidth,
              height: qrboxHeight
            };
          },
          aspectRatio: 1.777778, // 16:9
          disableFlip: false,
        },
        onScanSuccess,
        onScanFailure
      );

      setScanner(html5Qrcode);
      setIsScanning(true);
      setCameraReady(true);
      isInitializing.current = false;

      console.log('✅ Cámara iniciada correctamente');
    } catch (err: any) {
      console.error('Error iniciando cámara:', err);
      
      let errorMsg = 'Error al iniciar la cámara';
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        errorMsg = 'Permiso de cámara denegado. Por favor, permite el acceso.';
      } else if (err.name === 'NotFoundError') {
        errorMsg = 'No se encontró ninguna cámara';
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        errorMsg = 'La cámara está siendo usada por otra aplicación';
      } else if (err.message) {
        errorMsg = `Error: ${err.message}`;
      }
      
      setError(errorMsg);
      isInitializing.current = false;
    }
  };

  const stopCamera = async () => {
    if (scanner && isScanning) {
      try {
        await scanner.stop();
        scanner.clear();
        console.log('🛑 Cámara detenida');
      } catch (err) {
        console.error('Error deteniendo cámara:', err);
      }
    }
    setScanner(null);
    setIsScanning(false);
    setCameraReady(false);
    isInitializing.current = false;
  };

  const onScanSuccess = async (decodedText: string, decodedResult: any) => {
    console.log('✅ Código escaneado:', decodedText);
    console.log('📊 Formato:', decodedResult?.result?.format);
    
    // Detener el escáner inmediatamente
    await stopCamera();
    
    // Buscar el producto
    await buscarProducto(decodedText);
  };

  const onScanFailure = (error: string) => {
    // Incrementar intentos silenciosamente
    setScanAttempts(prev => prev + 1);
    
    // Solo mostrar mensaje cada 100 intentos fallidos
    if (scanAttempts > 0 && scanAttempts % 100 === 0) {
      console.log(`⏳ Buscando código... (${scanAttempts} intentos)`);
    }
  };

  const buscarProducto = async (codigo: string) => {
    try {
      console.log('🔍 Buscando producto:', codigo);
      
      const response = await fetch(`/api/productos/buscar?codigoBarras=${encodeURIComponent(codigo)}`);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        setError(errorData.error || 'Producto no encontrado con ese código');
        
        // Reintentar escaneo después de 2 segundos
        setTimeout(async () => {
          setError('');
          setScanAttempts(0);
          await initCamera();
        }, 2000);
        return;
      }

      const producto = await response.json();
      console.log('✅ Producto encontrado:', producto.producto);
      
      setScanAttempts(0);
      onProductFound(producto);
      onClose();
    } catch (err) {
      console.error('Error buscando producto:', err);
      setError('Error de conexión. Verifica tu internet.');
      
      setTimeout(async () => {
        setError('');
        setScanAttempts(0);
        await initCamera();
      }, 2000);
    }
  };

  const handleClose = async () => {
    await stopCamera();
    setError('');
    setScanAttempts(0);
    onClose();
  };

  const handleRetry = async () => {
    setError('');
    setScanAttempts(0);
    await stopCamera();
    setTimeout(() => initCamera(), 500);
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
            Apunta la cámara hacia el código de barras horizontal
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* CONTENEDOR DE VIDEO */}
          <div className="relative">
            <div
              id="reader"
              ref={readerRef}
              className="w-full rounded-lg overflow-hidden"
              style={{
                minHeight: '300px',
                maxHeight: '400px',
                background: '#000',
              }}
            ></div>

            {/* Loading overlay */}
            {!cameraReady && !error && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-900/80 rounded-lg">
                <div className="text-center">
                  <Loader2 className="h-10 w-10 animate-spin mx-auto mb-3 text-white" />
                  <p className="text-sm text-white font-medium">Iniciando cámara...</p>
                  <p className="text-xs text-gray-300 mt-1">Espera un momento</p>
                </div>
              </div>
            )}
          </div>

          {/* INSTRUCCIONES */}
          {cameraReady && !error && (
            <div className="bg-blue-50 p-3 rounded-lg">
              <div className="flex gap-2 text-sm text-blue-900">
                <Smartphone className="h-5 w-5 mt-0.5 flex-shrink-0" />
                <div className="space-y-1">
                  <p className="font-semibold">Consejos para escanear:</p>
                  <ul className="text-xs space-y-0.5">
                    <li>• Mantén el código dentro del recuadro</li>
                    <li>• Distancia: 10-20 cm del código</li>
                    <li>• Asegúrate de tener buena iluminación</li>
                    <li>• Mantén el teléfono estable</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* ERROR */}
          {error && (
            <div className="bg-red-50 p-3 rounded-lg border border-red-200">
              <div className="flex gap-2 text-sm text-red-700">
                <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-semibold">Error</p>
                  <p className="text-xs mt-1">{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* BOTONES */}
          <div className="flex gap-2">
            {error && (
              <Button 
                variant="default" 
                className="flex-1" 
                onClick={handleRetry}
              >
                <Camera className="h-4 w-4 mr-2" />
                Reintentar
              </Button>
            )}
            <Button 
              variant="outline" 
              className={error ? "flex-1" : "w-full"} 
              onClick={handleClose}
            >
              <X className="h-4 w-4 mr-2" />
              Cancelar
            </Button>
          </div>

          {/* Debug info (solo visible si hay muchos intentos) */}
          {scanAttempts > 50 && cameraReady && (
            <div className="text-xs text-center text-gray-500">
              Buscando código... ({scanAttempts} intentos)
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}