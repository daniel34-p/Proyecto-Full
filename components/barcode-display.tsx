'use client';

import { useEffect, useRef } from 'react';
import Barcode from 'react-barcode';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface BarcodeDisplayProps {
  codigo: string;
  producto: string;
  isOpen: boolean;
  onClose: () => void;
}

export function BarcodeDisplay({ codigo, producto, isOpen, onClose }: BarcodeDisplayProps) {
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    const printContent = printRef.current;
    if (!printContent) return;

    const printWindow = window.open('', '', 'width=800,height=600');
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>Imprimir Código de Barras</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              display: flex;
              justify-content: center;
              align-items: center;
              min-height: 100vh;
              margin: 0;
              padding: 20px;
            }
            .container {
              text-align: center;
              border: 2px solid #000;
              padding: 20px;
              max-width: 400px;
            }
            h2 {
              margin: 0 0 10px 0;
              font-size: 18px;
            }
            .barcode-container {
              margin: 20px 0;
            }
            @media print {
              body {
                margin: 0;
                padding: 0;
              }
            }
          </style>
        </head>
        <body>
          ${printContent.innerHTML}
        </body>
      </html>
    `);

    printWindow.document.close();
    
    // Esperar a que cargue antes de imprimir
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  const handleDownload = () => {
    const svg = printRef.current?.querySelector('svg');
    if (!svg) return;

    // Convertir SVG a canvas
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const img = new Image();
    
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);
      
      // Descargar como PNG
      canvas.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `codigo-barras-${codigo}.png`;
        a.click();
        URL.revokeObjectURL(url);
      });
    };

    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  };

  return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-md max-w-[95vw]">
        <DialogHeader>
          <DialogTitle>Código de Barras</DialogTitle>
          <DialogDescription>
            {producto}
          </DialogDescription>
        </DialogHeader>

        <div ref={printRef} className="container">
          <h2 style={{ margin: '0 0 10px 0', fontSize: '18px' }}>{producto}</h2>
          <div className="barcode-container" style={{ margin: '20px 0' }}>
            <Barcode
              value={codigo}
              format="CODE128"
              width={2}
              height={100}
              displayValue={true}
              fontSize={16}
              margin={10}
            />
          </div>
        </div>

        <div className="flex gap-2 justify-end mt-4">
          <Button variant="outline" onClick={handleDownload}>
            💾 Descargar PNG
          </Button>
          <Button onClick={handlePrint}>
            🖨️ Imprimir
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}