'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
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

// Tamaños en pt para el nombre del producto y la línea Ref/Emb en la vista
// previa / impresión HTML (la que usa "Imprimir" en escritorio). "MAX" es el
// tamaño ideal cuando el texto es corto; "MIN" es el piso por debajo del
// cual preferimos que quede un poco justo antes que ilegible.
const NOMBRE_FONT_MAX = 6.5;
const NOMBRE_FONT_MIN = 4;
const REF_FONT_MAX = 5;
const REF_FONT_MIN = 3.2;

export function BarcodeDisplay({ 
  codigo, 
  producto, 
  embalaje, 
  referencia, 
  isOpen, 
  onClose 
}: BarcodeDisplayProps) {
  const printRef = useRef<HTMLDivElement>(null);
  const nombreRef = useRef<HTMLDivElement>(null);
  const refEmbRef = useRef<HTMLDivElement>(null);
  const [esAndroid, setEsAndroid] = useState(false);
  const [fontNombre, setFontNombre] = useState(NOMBRE_FONT_MAX);
  const [fontRefEmb, setFontRefEmb] = useState(REF_FONT_MAX);

  useEffect(() => {
    setEsAndroid(/Android/i.test(navigator.userAgent));
  }, []);

  // Baja el tamaño de fuente de "el" en pasos de 0.25pt (nunca corta texto)
  // hasta que "cabe(el)" sea verdadero o se llegue al piso "min". Se usa
  // tanto para el nombre (que cabe en su caja de 2 líneas) como para
  // Ref/Emb (que cabe en una sola línea sin desbordarse).
  const ajustarFuente = (
    el: HTMLElement,
    max: number,
    min: number,
    cabe: (el: HTMLElement) => boolean,
    setFont: (n: number) => void
  ) => {
    let size = max;
    el.style.fontSize = `${size}pt`;
    while (!cabe(el) && size > min) {
      size = Math.max(min, size - 0.25);
      el.style.fontSize = `${size}pt`;
    }
    setFont(size);
  };

  // Recalcula el tamaño del nombre y de Ref/Emb cada vez que cambian los
  // datos o se abre el modal. Medimos directo sobre el DOM (scrollHeight /
  // scrollWidth vs. el tamaño real de la caja) para que el resultado sea
  // exacto según la fuente que realmente usa el navegador, y no una
  // estimación. Como "Imprimir" toma el HTML de este mismo nodo
  // (printRef.current.innerHTML), lo que se ve en la vista previa es
  // exactamente lo que sale impreso.
  useLayoutEffect(() => {
    if (!isOpen) return;
    const raf = requestAnimationFrame(() => {
      if (nombreRef.current) {
        ajustarFuente(
          nombreRef.current,
          NOMBRE_FONT_MAX,
          NOMBRE_FONT_MIN,
          (el) => el.scrollHeight <= el.clientHeight + 1,
          setFontNombre
        );
      }
      if (refEmbRef.current) {
        ajustarFuente(
          refEmbRef.current,
          REF_FONT_MAX,
          REF_FONT_MIN,
          (el) => el.scrollWidth <= el.clientWidth + 1,
          setFontRefEmb
        );
      }
    });
    return () => cancelAnimationFrame(raf);
  }, [isOpen, producto, embalaje, referencia]);

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
              size: 40mm 30mm;
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

            html, body {
              width: 40mm;
              height: 30mm;
              overflow: hidden;
            }

            .etiqueta-container {
              width: 40mm;
              height: 30mm;
              padding: 0.2mm 2.5mm 0.8mm 0.5mm;
              display: flex;
              flex-direction: column;
              justify-content: flex-start;
              align-items: center;
              overflow: hidden;
              background: white;
            }

            .codigo-barras-preview svg {
              max-width: 35mm !important;
              max-height: 13mm !important;
              width: auto !important;
              height: auto !important;
            }

            @media print {
              body {
                margin: 0 !important;
                padding: 0 !important;
              }

              .etiqueta-container {
                margin: 0 !important;
                padding: 0.2mm 2.5mm 0.8mm 0.5mm !important;
              }
            }
          </style>
        </head>
        <body>
          <div class="etiqueta-container">
            ${printContent.innerHTML}
          </div>
        </body>
      </html>
    `);

    printWindow.document.close();
    
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  // Reparte "texto" en líneas que quepan dentro de "anchoMax" con la fuente
  // ya seleccionada en ctx (ctx.font debe estar configurado antes de
  // llamarla). Nunca corta palabras ni agrega "...": si una línea no
  // alcanza, la palabra sobrante pasa a la siguiente línea.
  const ajustarTextoEnLineas = (
    ctx: CanvasRenderingContext2D,
    texto: string,
    anchoMax: number
  ): string[] => {
    const palabras = texto.trim().split(/\s+/);
    const lineas: string[] = [];
    let lineaActual = '';

    for (const palabra of palabras) {
      const intento = lineaActual ? `${lineaActual} ${palabra}` : palabra;
      if (ctx.measureText(intento).width > anchoMax && lineaActual) {
        lineas.push(lineaActual);
        lineaActual = palabra;
      } else {
        lineaActual = intento;
      }
    }
    if (lineaActual) lineas.push(lineaActual);
    return lineas;
  };

  // Busca, bajando desde "max" hasta "min" en pasos de "paso" px, el tamaño
  // de fuente más grande con el que "texto" entra en máximo "maxLineas"
  // líneas de ancho "anchoMax". Así el texto se hace más chico solo lo
  // necesario para que quepa completo, en vez de recortarse con "...". Si
  // ni siquiera al tamaño mínimo entra en "maxLineas" (nombre extremo), se
  // usa el tamaño mínimo igual y se devuelven las líneas que hagan falta,
  // para no perder texto.
  const calcularFuenteAjustada = (
    ctx: CanvasRenderingContext2D,
    texto: string,
    anchoMax: number,
    max: number,
    min: number,
    maxLineas: number,
    paso: number,
    fuenteCss: (size: number) => string
  ): { size: number; lineas: string[] } => {
    for (let size = max; size >= min; size -= paso) {
      ctx.font = fuenteCss(size);
      const lineas = ajustarTextoEnLineas(ctx, texto, anchoMax);
      if (lineas.length <= maxLineas) {
        return { size, lineas };
      }
    }
    ctx.font = fuenteCss(min);
    return { size: min, lineas: ajustarTextoEnLineas(ctx, texto, anchoMax) };
  };

  // Dibuja "lineas" centradas en "centroX", empezando en "topY" (el borde
  // superior disponible para el bloque, NO la línea base). Para cada línea
  // mide su alto real con ctx.measureText (actualBoundingBoxAscent /
  // actualBoundingBoxDescent) en vez de estimarlo con una proporción fija,
  // así que la posición se ajusta sola a mayúsculas, tildes, o cualquier
  // texto, sin importar el tamaño de letra. Devuelve el borde inferior real
  // del bloque (para que el siguiente bloque empiece justo después, sin
  // superponerse ni dejar espacio de más).
  const dibujarBloqueTexto = (
    ctx: CanvasRenderingContext2D,
    lineas: string[],
    centroX: number,
    topY: number,
    espacioEntreLineas: number
  ): number => {
    let y = topY;
    let ultimoDescent = 0;
    lineas.forEach((linea, idx) => {
      const metrica = ctx.measureText(linea);
      const ascent = metrica.actualBoundingBoxAscent || 0;
      const descent = metrica.actualBoundingBoxDescent || 0;
      y += ascent;
      ctx.fillText(linea, centroX, y);
      ultimoDescent = descent;
      if (idx < lineas.length - 1) {
        y += descent + espacioEntreLineas;
      }
    });
    return y + ultimoDescent;
  };

  // Dibuja la etiqueta completa (nombre, referencia/embalaje, código de
  // barras y código) en un canvas de 472×354px (40mm × 30mm a ~300 DPI).
  // Usada tanto por "Descargar PNG" como por "Imprimir Bluetooth", para que
  // ambas salidas se vean siempre igual y cualquier ajuste futuro solo se
  // haga en un solo lugar.
  //
  // El nombre y la línea Ref/Emb usan la misma idea que la vista previa:
  // el tamaño de letra baja hasta el mínimo legible antes de recortar nada,
  // y cada bloque de texto se posiciona con dibujarBloqueTexto(), que mide
  // el alto real de cada línea en vez de adivinarlo, así que nunca se
  // monta una línea (o un bloque) sobre otro. El código de barras usa el
  // espacio que sobra abajo, hasta un tope razonable (no se "infla" más
  // allá de eso), así que si el nombre/Ref/Emb son cortos, el sobrante
  // queda como margen de seguridad real antes del borde inferior en vez de
  // empujar el texto del código casi hasta el borde.
  const dibujarEtiquetaEnCanvas = (canvas: HTMLCanvasElement, img: HTMLImageElement) => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = 472;
    canvas.height = 354;

    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'black';
    ctx.textAlign = 'center';

    // Márgenes asimétricos: más margen a la derecha que a la izquierda para
    // recorrer todo el contenido hacia la izquierda dentro de la etiqueta.
    // Si necesitas correrlo aún más, baja "margenIzquierdo" o sube "margenDerecho".
    const margenIzquierdo = 35;
    const margenDerecho = 100;
    const anchoUtil = canvas.width - margenIzquierdo - margenDerecho;
    const centroX = margenIzquierdo + anchoUtil / 2;

    // Nombre del producto: bajamos la letra (32px → 20px) hasta que entre
    // completo en 2 líneas. dibujarBloqueTexto mide el alto real de cada
    // línea, así que nunca se monta una línea sobre otra (el problema de tu
    // primera foto) ni el bloque siguiente (Ref/Emb) se monta sobre esta
    // (el problema de tu segunda foto): cada bloque arranca justo después
    // del borde inferior real del anterior, más un pequeño respiro fijo.
    const { size: sizeNombre, lineas: lineasNombre } = calcularFuenteAjustada(
      ctx, producto, anchoUtil, 32, 20, 2, 2, (s) => `bold ${s}px Arial`
    );
    ctx.font = `bold ${sizeNombre}px Arial`;
    const RESPIRO_ENTRE_LINEAS = 4; // aire fijo entre líneas de un mismo bloque
    const RESPIRO_ENTRE_BLOQUES = 6; // aire fijo entre nombre y Ref/Emb
    let yPos = dibujarBloqueTexto(ctx, lineasNombre, centroX, 0, RESPIRO_ENTRE_LINEAS);

    // Referencia / Embalaje: mismo criterio (24px → 14px), normalmente en
    // una sola línea; si el texto es muy largo, se permite una segunda
    // línea en vez de recortarlo.
    if (embalaje || referencia) {
      const infoExtra = [];
      if (referencia) infoExtra.push(`Ref: ${referencia}`);
      if (embalaje) infoExtra.push(`Emb: ${embalaje}`);
      const textoRefEmb = infoExtra.join('   |   ');
      const { size: sizeRefEmb, lineas: lineasRefEmb } = calcularFuenteAjustada(
        ctx, textoRefEmb, anchoUtil, 24, 14, 1, 1, (s) => `600 ${s}px Arial`
      );
      ctx.font = `600 ${sizeRefEmb}px Arial`;
      yPos = dibujarBloqueTexto(ctx, lineasRefEmb, centroX, yPos + RESPIRO_ENTRE_BLOQUES, RESPIRO_ENTRE_LINEAS);
    } else {
      yPos += 6;
    }
    yPos += RESPIRO_ENTRE_BLOQUES;

    // Código de barras: usa el espacio vertical que sobre, pero con un tope
    // razonable (ALTURA_MAX_BARCODE) — antes se estiraba para ocupar TODO
    // lo que quedara libre, así que con un nombre/Ref/Emb cortos (como en
    // esta etiqueta) el código de barras se inflaba de más y empujaba el
    // texto del código casi hasta el borde inferior. Con el tope, ese
    // sobrante se queda como margen de seguridad real antes del borde.
    const gapBarcodeCodigo = 32; // separación entre el código de barras y el texto
    const altoTextoCodigo = 22;  // alto aproximado del texto "bold 26px Arial"
    const margenInferiorSeguridad = 14; // colchón real antes del borde de la etiqueta
    const espacioMinCodigo = gapBarcodeCodigo + altoTextoCodigo + margenInferiorSeguridad;
    const ALTURA_MAX_BARCODE = 140; // ~11.9mm — de sobra para escanear bien, sin inflarse más

    const alturaDisponibleBarcode = Math.min(
      canvas.height - yPos - espacioMinCodigo,
      ALTURA_MAX_BARCODE
    );
    const scale = Math.min(
      anchoUtil / img.width,
      alturaDisponibleBarcode / img.height
    );
    const barcodeX = margenIzquierdo + (anchoUtil - img.width * scale) / 2;
    ctx.drawImage(img, barcodeX, yPos, img.width * scale, img.height * scale);
    const barcodeBottomY = yPos + img.height * scale;

    // Código debajo, en negrita y pegado al código de barras. Ya no hace
    // falta el Math.min() de antes (que "aplastaba" el texto contra el
    // borde): al reservar bien el espacio arriba, esta posición siempre
    // deja colchón antes del final del canvas.
    ctx.font = 'bold 26px Arial';
    const codigoY = barcodeBottomY + gapBarcodeCodigo;
    ctx.fillText(codigo, centroX, codigoY);

        // AGREGA ESTO AL FINAL DE LA FUNCIÓN:
    // Recorta la imagen exactamente donde termina el texto del código para evitar margen blanco
    const altoRealContent = Math.min(canvas.height, codigoY + 16);
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = canvas.width;
    tempCanvas.height = altoRealContent;
    const tempCtx = tempCanvas.getContext('2d');
    if (tempCtx) {
      tempCtx.drawImage(canvas, 0, 0);
      canvas.height = altoRealContent;
      ctx.drawImage(tempCanvas, 0, 0);
    }
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

        <div className="border-2 border-dashed border-gray-300 p-4 bg-gray-50 rounded-md">
          <div
            ref={printRef}
            className="etiqueta-container"
            style={{
              width: '40mm',
              height: '30mm',
              background: 'white',
              padding: '0.2mm 2.5mm 0.8mm 0.5mm',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'flex-start',
              alignItems: 'center',
              textAlign: 'center'
            }}
          >
            {/* Información superior */}
            <div style={{
              textAlign: 'center',
              width: '100%'
            }}>
              {/* Nombre del producto: caja de alto fijo (2 líneas) para que nunca
                  empuje el resto de la etiqueta. La fuente (fontNombre) se
                  recalcula en el useLayoutEffect de arriba: baja hasta que el
                  nombre completo entra en esta caja, así que "..." solo debería
                  aparecer en casos extremos (una sola palabra imposible de
                  partir) como último recurso, no como comportamiento normal. */}
              <div
                ref={nombreRef}
                style={{
                  fontSize: `${fontNombre}pt`,
                  fontWeight: 'bold',
                  lineHeight: '1.05',
                  height: 'auto',
                  maxHeight: '4.4mm',
                  maxWidth: '37mm',
                  margin: '0 auto',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  wordBreak: 'break-word',
                  display: 'block',
                  textAlign: 'center'
                }}
              >
                {producto}
              </div>

              {/* Embalaje y Referencia: una sola línea; la fuente (fontRefEmb)
                  se recalcula igual que el nombre, así que solo se recorta con
                  "..." si el texto es tan largo que ni al tamaño mínimo cabe. */}
              {(embalaje || referencia) && (
              <div
                ref={refEmbRef}
                style={{
                  fontSize: `${fontRefEmb}pt`,
                  fontWeight: 600,
                  color: '#000',
                  maxWidth: '37mm',
                  margin: '0.3mm auto 0',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  letterSpacing: '0.2px'
                }}
              >
                {referencia && `Ref: ${referencia}`}
                {referencia && embalaje && ' | '}
                {embalaje && `Emb: ${embalaje}`}
              </div>
              )}
            </div>

            {/* Código de barras */}
            <div
              className="codigo-barras-preview"
              style={{
                margin: '0.3mm 0',
                width: '100%',
                height: '13mm',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center'
              }}
            >
              {codigo && (
                <Barcode
                  value={codigo}
                  format="CODE128"
                  width={1.8}           // Perfecto para no salirse
                  height={72}         // Más alto para escaneo
                  displayValue={false}
                  // Zona de silencio (quiet zone): un lector de código de
                  // barras necesita margen en blanco a los lados para poder
                  // detectar dónde empieza y termina el patrón. Con margin=0
                  // (como estaba antes) las barras podían quedar pegadas al
                  // borde de la etiqueta y fallar el escaneo; este margen es
                  // chico para no quitarle espacio al código, pero suficiente
                  // para que lectores láser y de cámara lo lean bien.
                  marginTop={2}
                  marginBottom={2}
                  marginLeft={8}
                  marginRight={8}
                />
              )}
            </div>
            <style>{`
              .codigo-barras-preview svg {
                max-width: 35mm !important;
                max-height: 13mm !important;
                width: auto !important;
                height: auto !important;
              }
            `}</style>

            {/* Código debajo: una sola línea, se recorta si no cabe */}
            <div style={{
              fontSize: '6.5pt',
              fontWeight: 'bold',
              lineHeight: '1',
              textAlign: 'center',
              maxWidth: '37mm',
              margin: '0.3mm auto 0',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              letterSpacing: '0.3px'
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