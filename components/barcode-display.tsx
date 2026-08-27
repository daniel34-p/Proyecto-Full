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
              size: 40mm 30mm landscape;
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
              width: 40mm;
              height: 30mm;
              padding: 0.8mm 2mm;
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
              margin-bottom: 0.5mm;
            }
            
            .producto-nombre {
              font-size: 5.5pt;
              font-weight: bold;
              margin-bottom: 0.4mm;
              line-height: 1.1;
              max-width: 35mm;
              overflow: hidden;
              text-overflow: ellipsis;
              display: -webkit-box;
              -webkit-line-clamp: 2;
              -webkit-box-orient: vertical;
            }
            
            .info-extra {
              font-size: 4.8pt;
              color: #333;
              margin-bottom: 0.4mm;
              max-width: 35mm;
            }
            
            .codigo-barras {
              display: flex;
              justify-content: center;
              align-items: center;
              margin: 0.5mm 0;
            }
            
            .codigo-barras svg {
              max-width: 35mm !important;
              height: auto !important;
            }
            
            .codigo-texto {
              font-size: 6.5pt;
              font-weight: bold;
              text-align: center;
              margin-top: 0.3mm;
              letter-spacing: 0.3px;
              max-width: 35mm;
            }
            
            @media print {
              body {
                margin: 0 !important;
                padding: 0 !important;
              }
              
              .etiqueta-container {
                margin: 0 !important;
                padding: 0.8mm 2mm !important;
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

  // Prueba varios tamaños de fuente (de mayor a menor) para el nombre del
  // producto y devuelve el primero que quepa en 2 líneas SIN truncar. Si
  // ninguno cabe, usa el tamaño más chico de la lista y recorta la 2da
  // línea con "...". Así, en una etiqueta tan chica, primero se intenta
  // achicar la letra antes de perder información.
  const ajustarNombreProducto = (
    ctx: CanvasRenderingContext2D,
    texto: string,
    anchoMax: number,
    tamanios: number[]
  ): { fontSize: number; linea1: string; linea2: string } => {
    let ultimoIntento = { fontSize: tamanios[tamanios.length - 1], linea1: '', linea2: '' };

    for (const fontSize of tamanios) {
      ctx.font = `bold ${fontSize}px Arial`;
      const palabras = texto.trim().split(/\s+/);
      let linea1 = '';
      let i = 0;

      for (; i < palabras.length; i++) {
        const intento = linea1 ? `${linea1} ${palabras[i]}` : palabras[i];
        if (ctx.measureText(intento).width > anchoMax && linea1) break;
        linea1 = intento;
      }

      const linea2 = palabras.slice(i).join(' ');
      const cabeSinTruncar = !linea2 || ctx.measureText(linea2).width <= anchoMax;

      if (cabeSinTruncar) {
        return { fontSize, linea1, linea2 };
      }

      ultimoIntento = { fontSize, linea1, linea2 };
    }

    // Ningún tamaño cupo sin truncar: recorta la 2da línea del intento
    // más pequeño con "..." para no salirse de la etiqueta.
    ctx.font = `bold ${ultimoIntento.fontSize}px Arial`;
    let linea2 = ultimoIntento.linea2;
    while (linea2.length > 3 && ctx.measureText(linea2 + '...').width > anchoMax) {
      linea2 = linea2.slice(0, -1);
    }
    if (linea2) linea2 += '...';

    return { ...ultimoIntento, linea2 };
  };

  // Ajusta una línea de texto de una sola línea (referencia/embalaje o el
  // código): primero achica la fuente hasta un mínimo; si aun así no cabe,
  // recorta el texto con "..." como último recurso.
  const ajustarLineaSimple = (
    ctx: CanvasRenderingContext2D,
    texto: string,
    anchoMax: number,
    peso: string,
    tamanioInicial: number,
    tamanioMin: number
  ): { fontSize: number; texto: string } => {
    let fontSize = tamanioInicial;
    ctx.font = `${peso} ${fontSize}px Arial`;

    while (fontSize > tamanioMin && ctx.measureText(texto).width > anchoMax) {
      fontSize -= 2;
      ctx.font = `${peso} ${fontSize}px Arial`;
    }

    let textoFinal = texto;
    if (ctx.measureText(textoFinal).width > anchoMax) {
      while (textoFinal.length > 3 && ctx.measureText(textoFinal + '...').width > anchoMax) {
        textoFinal = textoFinal.slice(0, -1);
      }
      textoFinal += '...';
    }

    return { fontSize, texto: textoFinal };
  };

  // Dibuja la etiqueta completa (nombre, referencia/embalaje, código de
  // barras y código) en un canvas de 472×354px (40mm × 30mm a ~300 DPI).
  // Usada tanto por "Descargar PNG" como por "Imprimir Bluetooth", para que
  // ambas salidas se vean siempre igual y cualquier ajuste futuro solo se
  // haga en un solo lugar.
  const dibujarEtiquetaEnCanvas = (canvas: HTMLCanvasElement, img: HTMLImageElement) => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = 472;
    canvas.height = 354;

    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'black';
    ctx.textAlign = 'center';

    // 1. Margen para Texto (Margen lateral sutilmente aumentado):
    const margenIzquierdoTexto = 30; // Margen sutil a la izquierda
    const margenDerechoTexto = 30;   // Margen sutil a la derecha
    const anchoUtilTexto = canvas.width - margenIzquierdoTexto - margenDerechoTexto;
    const centroX = canvas.width / 2;

    // 2. Margen exclusivo para el Código de Barras:
    const margenIzquierdoBarcode = 50; 
    const margenDerechoBarcode = 50;
    const anchoUtilBarcode = canvas.width - margenIzquierdoBarcode - margenDerechoBarcode;

    // Nombre del producto: usa el anchoUtilTexto ajustado
    const tamaniosNombre = [25, 22, 20, 18];
    const { fontSize: fuenteNombre, linea1, linea2 } = ajustarNombreProducto(
      ctx, producto, anchoUtilTexto, tamaniosNombre
    );
    ctx.font = `bold ${fuenteNombre}px Arial`;
    const lineHeight = fuenteNombre + 6;
    let yPos = fuenteNombre + 8;
    ctx.fillText(linea1, centroX, yPos);
    if (linea2) {
      yPos += lineHeight;
      ctx.fillText(linea2, centroX, yPos);
    }
    yPos += lineHeight * 0.45;

    // Referencia / Embalaje
    if (embalaje || referencia) {
      const infoExtra = [];
      if (referencia) infoExtra.push(`Ref: ${referencia}`);
      if (embalaje) infoExtra.push(`Emb: ${embalaje}`);
      const { fontSize: fuenteInfo, texto: textoInfo } = ajustarLineaSimple(
        ctx, infoExtra.join('  |  '), anchoUtilTexto, '600', 22, 15
      );
      ctx.font = `600 ${fuenteInfo}px Arial`;
      ctx.fillText(textoInfo, centroX, yPos);
      yPos += fuenteInfo + 6;
    } else {
      yPos += 6;
    }

    // Código de barras (Usa su propio espacio reducido: anchoUtilBarcode)
    const espacioMinCodigo = 30;
    const alturaDisponibleBarcode = canvas.height - yPos - espacioMinCodigo;
    const scale = Math.min(
      anchoUtilBarcode / img.width,
      alturaDisponibleBarcode / img.height
    );
    const barcodeX = (canvas.width - img.width * scale) / 2;
    ctx.drawImage(img, barcodeX, yPos, img.width * scale, img.height * scale);
    const barcodeBottomY = yPos + img.height * scale;

    // Código texto debajo
    const { fontSize: fuenteCodigo, texto: codigoFinal } = ajustarLineaSimple(
      ctx, codigo, anchoUtilTexto, 'bold', 26, 16
    );
    ctx.font = `bold ${fuenteCodigo}px Arial`;
    const codigoY = Math.min(barcodeBottomY + fuenteCodigo * 0.85 + 6, canvas.height - 8);
    ctx.fillText(codigoFinal, centroX, codigoY);
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
            Listo para imprimir en etiqueta de 40mm × 30mm
          </DialogDescription>
        </DialogHeader>

        {/* Fuerza que el SVG del código de barras escale dentro del ancho de la etiqueta */}
        <style>{`
          .barcode-etiqueta-preview svg {
            width: 100% !important;
            max-width: 35mm !important;
            height: auto !important;
          }
        `}</style>

        <div className="border-2 border-dashed border-gray-300 p-4 bg-gray-50 rounded-md">
          <div 
            ref={printRef} 
            className="etiqueta-container"
            style={{
              width: '40mm',
              height: '30mm',
              background: 'white',
              padding: '0.8mm 2mm',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              alignItems: 'center',
              textAlign: 'center',
              overflow: 'hidden'
            }}
          >
            {/* Información superior */}
            <div style={{ 
              textAlign: 'center', 
              width: '100%',
              marginBottom: '0.5mm'
            }}>
              {/* Nombre del producto */}
              <div style={{ 
                fontSize: '7pt',
                fontWeight: 'bold',
                lineHeight: '1.2',
                maxWidth: '35mm',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                display: '-webkit-box',
                marginBottom: '0.5mm',
                textAlign: 'center'
              }}>
                {producto}
              </div>
              
              {/* Embalaje y Referencia */}
              {(embalaje || referencia) && (
              <div style={{
                fontSize: '6pt',
                fontWeight: 600,
                color: '#000',
                marginBottom: '1mm',
                letterSpacing: '0.2px',
                maxWidth: '35mm',
                margin: '0 auto',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}>
                {referencia && `Ref: ${referencia}`}
                {referencia && embalaje && ' | '}
                {embalaje && `Emb: ${embalaje}`}
              </div>
              )}
            </div>

            {/* Código de barras */}
            <div 
              className="barcode-etiqueta-preview"
              style={{ 
                margin: '0.5mm 0',
                width: '100%',
                display: 'flex',
                justifyContent: 'center'
              }}
            >
              {codigo && (
                <Barcode
                  value={codigo}
                  format="CODE128"
                  width={1.8}           // Grosor de barra alto para mantener nitidez al escalar
                  height={55}         // Alto ajustado a la etiqueta de 30mm
                  displayValue={false}
                  margin={0}
                />
              )}
            </div>

            {/* Código debajo */}
            <div style={{ 
              fontSize: '8pt', 
              fontWeight: 'bold',
              textAlign: 'center',
              marginTop: '0.5mm',
              letterSpacing: '0.3px',
              maxWidth: '35mm',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
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