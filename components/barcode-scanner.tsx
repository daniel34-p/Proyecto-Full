'use client';

import { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Loader2, Camera, X, Smartphone, Flashlight, FlashlightOff } from 'lucide-react';

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
  const [torchOn, setTorchOn] = useState(false);

  const readerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (isOpen && !scanner && !isScanning) {
      setTimeout(() => initCamera(), 300);
    }

    return () => {
      if (!isOpen) stopCamera();
    };
  }, [isOpen]);

  const initCamera = async () => {
    try {
      setError('');
      setCameraReady(false);

      if (!readerRef.current) {
        setError('Error: Contenedor del escáner no encontrado');
        return;
      }

      const html5Qrcode = new Html5Qrcode('reader');

      // Obtener cámaras
      let cameras = [];
      try {
        cameras = await Html5Qrcode.getCameras();
      } catch {
        setError('No se pudo acceder a la cámara');
        return;
      }

      if (cameras.length === 0) {
        setError('No hay cámaras disponibles');
        return;
      }

      // Preferir cámara trasera
      const preferred = cameras.find(c =>
        c.label.toLowerCase().includes('back') ||
        c.label.toLowerCase().includes('rear') ||
        c.label.toLowerCase().includes('environment')
      );

      const cameraId = preferred ? preferred.id : cameras[0].id;

      await html5Qrcode.start(
        cameraId,
        {
          fps: 30,
          qrbox: { width: 350, height: 220 },  // Más ancho = mejor para barras
          aspectRatio: 1.777,
          experimentalFeatures: {
            useBarCodeDetectorIfSupported: true,
          },
          videoConstraints: {
            facingMode: 'environment',
            focusMode: 'continuous',
            advanced: [
              { focusMode: 'continuous' },
              { exposureMode: 'continuous' },
              { zoom: 2 },
              { torch: torchOn },
            ],
          },
        },
        onScanSuccess,
        () => {}
      );

      setScanner(html5Qrcode);
      setIsScanning(true);
      setCameraReady(true);
    } catch (err: any) {
      setError('Error al iniciar cámara: ' + err.message);
    }
  };

  const stopCamera = async () => {
    if (scanner && isScanning) {
      try {
        await scanner.stop();
        scanner.clear();
      } catch {}
    }
    setScanner(null);
    setIsScanning(false);
    setCameraReady(false);
  };

  const onScanSuccess = async (decodedText: string) => {
    await stopCamera();
    await buscarProducto(decodedText);
  };

  const buscarProducto = async (codigo: string) => {
    try {
      const response = await fetch(`/api/productos/buscar?codigoBarras=${codigo}`);

      if (!response.ok) {
        setError('Producto no encontrado');
        setTimeout(() => {
          setError('');
          initCamera();
        }, 1500);
        return;
      }

      const producto = await response.json();
      onProductFound(producto);
      onClose();
    } catch {
      setError('Error conectando con el servidor');
      setTimeout(() => {
        setError('');
        initCamera();
      }, 1500);
    }
  };

  const toggleTorch = async () => {
    setTorchOn(prev => !prev);
    await stopCamera();
    setTimeout(() => initCamera(), 200);
  };

  const handleClose = async () => {
    await stopCamera();
    setError('');
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
            Apunta la cámara hacia el código de barras.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* CONTENEDOR DE VIDEO */}
          <div className="relative">
            <div
              id="reader"
              ref={readerRef}
              style={{
                width: '100%',
                height: '320px',
                background: '#000',
                borderRadius: '8px',
              }}
            ></div>

            {!cameraReady && !error && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded-md">
                <div className="text-center">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-gray-400" />
                  <p className="text-sm text-gray-600">Iniciando cámara...</p>
                </div>
              </div>
            )}
          </div>

          {/* INFO */}
          {cameraReady && !error && (
            <div className="bg-blue-50 p-3 rounded-md text-sm text-blue-800 flex gap-2">
              <Smartphone className="h-4 w-4 mt-0.5" />
              Mantén el código dentro del recuadro y a 10–20 cm de distancia.
            </div>
          )}

          {/* ERROR */}
          {error && (
            <div className="p-3 text-sm text-red-600 bg-red-50 rounded-md border border-red-200">
              {error}
            </div>
          )}

          {/* BOTONES */}
          <div className="flex gap-2">
            <Button variant="outline" className="w-full" onClick={toggleTorch}>
              {torchOn ? <FlashlightOff className="h-4 w-4 mr-2" /> : <Flashlight className="h-4 w-4 mr-2" />}
              {torchOn ? 'Apagar linterna' : 'Encender linterna'}
            </Button>

            <Button variant="outline" className="w-full" onClick={handleClose}>
              <X className="h-4 w-4 mr-2" />
              Cancelar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
