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
  embalaje?: string;
  referencia?: string;
  isOpen: boolean;
  onClose: () => void;
}

export function BarcodeDisplay({ 
  codigo, 
  producto, 
  embalaje, 
  referencia, 
  isOpen, 
  onClose 
}: BarcodeDisplayProps) {
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
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            
            @page {
              size: 58mm 40mm landscape;
              margin: 0;
            }

            body {
              margin: 0;
              padding: 0;
              font-family: Arial, sans-serif;
            }

            body {
              writing-mode: horizontal-tb !important;
            }
            
            .etiqueta-container {
              width: 58mm;
              height: 40mm;
              padding: 2mm;
              display: flex;
              flex-direction: column;
              justify-content: center;
              align-items: center;
              page-break-after: always;
              background: white;
            }
            
            .info-superior {
              text-align: center;
              width: 100%;
              margin-bottom: 1mm;
            }
            
            .producto-nombre {
              font-size: 7pt;
              font-weight: bold;
              margin-bottom: 0.5mm;
              line-height: 1.1;
              max-height: 14pt;
              overflow: hidden;
              text-overflow: ellipsis;
              display: -webkit-box;
              -webkit-line-clamp: 2;
              -webkit-box-orient: vertical;
            }
            
            .info-extra {
              font-size: 6pt;
              color: #333;
              margin-bottom: 0.5mm;
            }
            
            .codigo-barras {
              display: flex;
              justify-content: center;
              align-items: center;
              margin: 1mm 0;
            }
            
            .codigo-barras svg {
              max-width: 52mm !important;
              height: auto !important;
            }
            
            .codigo-texto {
              font-size: 8pt;
              font-weight: bold;
              text-align: center;
              margin-top: 0.5mm;
              letter-spacing: 0.5px;
            }
            
            @media print {
              body {
                margin: 0 !important;
                padding: 0 !important;
              }
              
              .etiqueta-container {
                margin: 0 !important;
                padding: 2mm !important;
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
    
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  const handleDownload = () => {
    const svg = printRef.current?.querySelector('svg');
    if (!svg) return;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 58mm × 40mm a 300 DPI = 685px × 472px
    canvas.width = 685;
    canvas.height = 472;

    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const svgData = new XMLSerializer().serializeToString(svg);
    const img = new Image();
    
    img.onload = () => {
      ctx.fillStyle = 'black';
      ctx.textAlign = 'center';
      
      let yPos = 30;
      
      // Nombre del producto
      ctx.font = 'bold 14px Arial';
      const productText = producto.length > 45 ? producto.substring(0, 45) + '...' : producto;
      ctx.fillText(productText, canvas.width / 2, yPos);
      yPos += 20;
      
      // Embalaje y referencia
      if (embalaje || referencia) {
        ctx.font = '11px Arial';
        const infoExtra = [];
        if (referencia) infoExtra.push(`Ref: ${referencia}`);
        if (embalaje) infoExtra.push(`Emb: ${embalaje}`);
        ctx.fillText(infoExtra.join(' | '), canvas.width / 2, yPos);
        yPos += 25;
      } else {
        yPos += 15;
      }
      
      // Código de barras
      const scale = Math.min(
        (canvas.width - 40) / img.width,
        (canvas.height - yPos - 80) / img.height
      );
      const x = (canvas.width - img.width * scale) / 2;
      ctx.drawImage(img, x, yPos, img.width * scale, img.height * scale);
      
      // Código debajo
      ctx.font = 'bold 16px Arial';
      ctx.fillText(codigo, canvas.width / 2, canvas.height - 25);
      
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
            Listo para imprimir en etiqueta de 58mm × 40mm
          </DialogDescription>
        </DialogHeader>

        <div className="border-2 border-dashed border-gray-300 p-4 bg-gray-50 rounded-md">
          <div 
            ref={printRef} 
            className="etiqueta-container"
            style={{
              width: '58mm',
              height: '40mm',
              background: 'white',
              padding: '3mm 2mm',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              alignItems: 'center',
              textAlign: 'center'
            }}
          >
            {/* Información superior */}
            <div style={{ 
              textAlign: 'center', 
              width: '100%',
              marginBottom: '1mm'
            }}>
              {/* Nombre del producto */}
              <div style={{ 
                fontSize: '8pt',
                fontWeight: 'bold',
                lineHeight: '1.2',
                maxWidth: '50mm',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                display: '-webkit-box',
                marginBottom: '1mm',
                textAlign: 'center'
              }}>
                {producto}
              </div>
              
              {/* Embalaje y Referencia */}
              {(embalaje || referencia) && (
              <div style={{
                fontSize: '8pt',
                fontWeight: 600,
                color: '#000',
                marginBottom: '2mm',
                letterSpacing: '0.3px'
              }}>
                {referencia && `Ref: ${referencia}`}
                {referencia && embalaje && ' | '}
                {embalaje && `Emb: ${embalaje}`}
              </div>
              )}
            </div>

            {/* Código de barras */}
            <div style={{ 
              margin: '1mm 0',
              width: '100%',
              display: 'flex',
              justifyContent: 'center'
            }}>
              <Barcode
                value={codigo}
                format="CODE128"
                width={1.25}           // Perfecto para no salirse
                height={46}         // Más alto para escaneo
                displayValue={false}
                margin={0}
              />
            </div>

            {/* Código debajo */}
            <div style={{ 
              fontSize: '9pt', 
              fontWeight: 'bold',
              textAlign: 'center',
              marginTop: '1mm',
              letterSpacing: '0.5px'
            }}>
              {codigo}
            </div>
          </div>
        </div>

        <div className="bg-blue-50 p-3 rounded-md text-xs text-blue-800">
          <p className="font-semibold mb-1">📏 Configuración de etiqueta:</p>
          <p>• Tamaño: 58mm (ancho) × 40mm (alto)</p>
          <p>• Orientación: Horizontal</p>
          <p>• Producto, Ref y Embalaje arriba | Código debajo</p>
        </div>

        <div className="flex gap-2 justify-end mt-4">
          <Button variant="outline" onClick={handleDownload} size="sm">
            💾 Descargar PNG
          </Button>
          <Button onClick={handlePrint} size="sm">
            🖨️ Imprimir
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}