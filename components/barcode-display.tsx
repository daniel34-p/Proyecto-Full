'use client';

import { useEffect, useRef, useState } from 'react';
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
  const [esAndroid, setEsAndroid] = useState(false);

  useEffect(() => {
    setEsAndroid(/Android/i.test(navigator.userAgent));
  }, []);

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

  // Divide el nombre del producto en máximo 2 líneas que quepan en el ancho
  // disponible; si aún así no cabe, recorta la segunda línea con "...".
  const dividirEnDosLineas = (
    ctx: CanvasRenderingContext2D,
    texto: string,
    anchoMax: number
  ): [string, string] => {
    const palabras = texto.trim().split(/\s+/);
    let linea1 = '';
    let i = 0;

    for (; i < palabras.length; i++) {
      const intento = linea1 ? `${linea1} ${palabras[i]}` : palabras[i];
      if (ctx.measureText(intento).width > anchoMax && linea1) break;
      linea1 = intento;
    }

    let linea2 = palabras.slice(i).join(' ');

    if (linea2 && ctx.measureText(linea2).width > anchoMax) {
      while (linea2.length > 3 && ctx.measureText(linea2 + '...').width > anchoMax) {
        linea2 = linea2.slice(0, -1);
      }
      linea2 = linea2 + '...';
    }

    return [linea1, linea2];
  };

  // Dibuja la etiqueta completa (nombre, referencia/embalaje, código de
  // barras y código) en un canvas de 685×472px (58mm × 40mm a ~300 DPI).
  // Usada tanto por "Descargar PNG" como por "Imprimir Bluetooth", para que
  // ambas salidas se vean siempre igual y cualquier ajuste futuro solo se
  // haga en un solo lugar.
  const dibujarEtiquetaEnCanvas = (canvas: HTMLCanvasElement, img: HTMLImageElement) => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = 685;
    canvas.height = 472;

    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'black';
    ctx.textAlign = 'center';

    // Márgenes asimétricos: más margen a la izquierda que a la derecha para
    // recorrer todo el contenido hacia la derecha dentro de la etiqueta.
    // Si necesitas correrlo aún más, sube "margenIzquierdo" o baja "margenDerecho".
    const margenIzquierdo = 80;
    const margenDerecho = 40;
    const anchoUtil = canvas.width - margenIzquierdo - margenDerecho;
    const centroX = margenIzquierdo + anchoUtil / 2;

    // Nombre del producto: fuente grande, hasta 2 líneas
    ctx.font = 'bold 48px Arial';
    const [linea1, linea2] = dividirEnDosLineas(ctx, producto, anchoUtil);
    let yPos = 42;
    ctx.fillText(linea1, centroX, yPos);
    yPos += 42;
    if (linea2) {
      ctx.fillText(linea2, centroX, yPos);
      yPos += 42;
    }
    yPos += 6;

    // Referencia / Embalaje
    if (embalaje || referencia) {
      ctx.font = '600 38px Arial';
      const infoExtra = [];
      if (referencia) infoExtra.push(`Ref: ${referencia}`);
      if (embalaje) infoExtra.push(`Emb: ${embalaje}`);
      ctx.fillText(infoExtra.join('   |   '), centroX, yPos);
      yPos += 42;
    } else {
      yPos += 10;
    }

    // Código de barras (usa el espacio restante, dejando solo lo mínimo
    // reservado para el texto del código, que ahora va pegado justo debajo)
    const espacioMinCodigo = 42;
    const alturaDisponibleBarcode = canvas.height - yPos - espacioMinCodigo;
    const scale = Math.min(
      anchoUtil / img.width,
      alturaDisponibleBarcode / img.height
    );
    const barcodeX = margenIzquierdo + (anchoUtil - img.width * scale) / 2;
    ctx.drawImage(img, barcodeX, yPos, img.width * scale, img.height * scale);
    const barcodeBottomY = yPos + img.height * scale;

    // Código debajo, grande, en negrita y pegado al código de barras
    ctx.font = 'bold 40px Arial';
    const codigoY = Math.min(barcodeBottomY + 60, canvas.height - 10);
    ctx.fillText(codigo, centroX, codigoY);
  };

  // Carga el SVG del código de barras como imagen y ejecuta el callback con
  // el canvas ya dibujado, listo para descargar o enviar a RawBT.
  const generarEtiquetaCanvas = (onListo: (canvas: HTMLCanvasElement) => void) => {
    const svg = printRef.current?.querySelector('svg');
    if (!svg) return;

    const canvas = document.createElement('canvas');
    const svgData = new XMLSerializer().serializeToString(svg);
    const img = new Image();

    img.onload = () => {
      dibujarEtiquetaEnCanvas(canvas, img);
      onListo(canvas);
    };

    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  };

  const handleDownload = () => {
    generarEtiquetaCanvas((canvas) => {
      canvas.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `codigo-barras-${codigo}.png`;
        a.click();
        URL.revokeObjectURL(url);
      });
    });
  };

  // Genera la misma etiqueta y la envía directamente a RawBT para imprimir
  // por Bluetooth en el celular.
  const handleImprimirBluetooth = () => {
    generarEtiquetaCanvas((canvas) => {
      // RawBT acepta un data URI estándar de imagen con el prefijo "rawbt:".
      // Documentación oficial: rawbt:data:image/png;base64,<...>
      const dataUrl = canvas.toDataURL('image/png');
      window.location.href = 'rawbt:' + dataUrl;
    });
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
              padding: '1mm 2mm',
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
                fontSize: '10pt',
                fontWeight: 'bold',
                lineHeight: '1.4',
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
                fontSize: '9pt',
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
              {codigo && (
                <Barcode
                  value={codigo}
                  format="CODE128"
                  width={1.8}           // Perfecto para no salirse
                  height={72}         // Más alto para escaneo
                  displayValue={false}
                  margin={0}
                />
              )}
            </div>

            {/* Código debajo */}
            <div style={{ 
              fontSize: '11pt', 
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
          <p className="font-semibold mb-1"> 🖨️ Configuración de impresión 🖨️</p>
          <p>• Para Dispositivos Móviles Presionar El Boton:</p>
          <p>*** IMPRIMIR ETIQUETA ***</p>
          <p>• Para Dispositivos Escritorio Presionar El Boton:</p>
          <p>*** IMPRIMIR ***</p>
        </div>

        <div className="flex gap-2 justify-end mt-4 flex-wrap">
          {esAndroid && (
            <Button onClick={handleImprimirBluetooth} size="sm" className="bg-blue-600 hover:bg-blue-700">
              🏷️ Imprimir Etiqueta
            </Button>
          )}
          <Button onClick={handlePrint} size="sm">
            🖨️ Imprimir
          </Button>
          <Button variant="outline" onClick={handleDownload} size="sm">
            💾 Descargar PNG
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}