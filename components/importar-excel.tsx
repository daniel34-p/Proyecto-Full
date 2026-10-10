'use client';

import { useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { FileSpreadsheet, Download, Upload, Loader2, CheckCircle2, AlertCircle, Minus, AlertTriangle } from 'lucide-react';
import { leerExcelImportacion, generarPlantillaImportacion, FilaImportacionCruda } from '@/lib/excel-import';

interface Comparacion {
  origen: 'base de datos' | 'este mismo archivo';
  fila?: number;
  proveedor: string;
  cantidad: string;
  unidades: string;
  seccion: string;
  precioVenta: string;
}

interface PosibleDuplicado {
  tipo: 'exacto' | 'referencia' | 'nombre';
  motivo: string;
  comparadoCon: Comparacion;
}

interface FilaPrevisualizada {
  fila: number;
  proveedor: string;
  referencia: string;
  producto: string;
  cantidad: number;
  unidades: string;
  costoReal: number;
  precioVenta: string;
  seccion: string;
  embalaje: string;
  posibleDuplicado?: PosibleDuplicado;
}

interface Preview {
  totalFilas: number;
  conPosibleDuplicado: number;
  previsualizacion: FilaPrevisualizada[];
}

interface ErrorGuardado {
  fila: number;
  motivo: string;
}

interface Resultado {
  totalFilas: number;
  importados: number;
  excluidos: number;
  erroresAlGuardar: ErrorGuardado[];
}

interface ImportarExcelProps {
  centroCostoId: string;
  centroCostoNombre?: string;
  onImportado: () => void;
}

// El backend guarda en bloques de hasta 1000 filas; se envían de 500 en 500
// para que cada petición sea rápida incluso en el plan gratuito de
// Vercel/Neon, y para poder mostrar progreso en archivos grandes.
const TAMANIO_LOTE = 500;
// Las listas de la vista previa se paginan en el propio navegador sobre los
// datos ya descargados - cambiar de página NO vuelve a llamar al servidor,
// así que no tiene costo extra de red ni de base de datos.
const TAMANIO_PAGINA = 100;

function Pager({
  pagina,
  totalPaginas,
  onCambiar,
}: {
  pagina: number;
  totalPaginas: number;
  onCambiar: (pagina: number) => void;
}) {
  if (totalPaginas <= 1) return null;
  return (
    <div className="flex items-center justify-between px-3 py-1.5 bg-gray-50 border-t text-xs">
      <Button type="button" variant="ghost" size="sm" className="h-6 px-2" onClick={() => onCambiar(pagina - 1)} disabled={pagina <= 1}>
        Anterior
      </Button>
      <span className="text-gray-600">Página {pagina} de {totalPaginas}</span>
      <Button type="button" variant="ghost" size="sm" className="h-6 px-2" onClick={() => onCambiar(pagina + 1)} disabled={pagina >= totalPaginas}>
        Siguiente
      </Button>
    </div>
  );
}

function tituloAviso(tipo: PosibleDuplicado['tipo']): string {
  if (tipo === 'exacto') return 'Posible duplicado exacto';
  if (tipo === 'referencia') return 'Misma referencia, nombre distinto';
  return 'Mismo nombre, referencia distinta';
}

export function ImportarExcel({ centroCostoId, centroCostoNombre, onImportado }: ImportarExcelProps) {
  const [open, setOpen] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');
  const [filasCrudas, setFilasCrudas] = useState<FilaImportacionCruda[] | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [progreso, setProgreso] = useState<{ loteActual: number; totalLotes: number } | null>(null);
  const [filasExcluidas, setFilasExcluidas] = useState<Set<number>>(new Set());
  const [paginaIncluidas, setPaginaIncluidas] = useState(1);
  const [paginaExcluidas, setPaginaExcluidas] = useState(1);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Derivados en memoria sobre lo que ya se descargó - ningún cambio de
  // página o de exclusión dispara una petición nueva al servidor.
  const incluidas = useMemo(
    () => (preview ? preview.previsualizacion.filter((f) => !filasExcluidas.has(f.fila)) : []),
    [preview, filasExcluidas]
  );
  const excluidas = useMemo(
    () => (preview ? preview.previsualizacion.filter((f) => filasExcluidas.has(f.fila)) : []),
    [preview, filasExcluidas]
  );

  const authHeaders = () => {
    const token = localStorage.getItem('token');
    return { Authorization: token ? `Bearer ${token}` : '', 'Content-Type': 'application/json' };
  };

  const reiniciar = () => {
    setError('');
    setFilasCrudas(null);
    setPreview(null);
    setResultado(null);
    setFilasExcluidas(new Set());
    setPaginaIncluidas(1);
    setPaginaExcluidas(1);
    if (inputRef.current) inputRef.current.value = '';
  };

  const handleOpenChange = (abierto: boolean) => {
    setOpen(abierto);
    if (!abierto) reiniciar();
  };

  const handleArchivo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const archivo = e.target.files?.[0];
    if (!archivo) return;

    setError('');
    setPreview(null);
    setResultado(null);
    setFilasExcluidas(new Set());
    setCargando(true);

    try {
      const { filas, columnasFaltantes } = await leerExcelImportacion(archivo);

      if (columnasFaltantes.length > 0) {
        setError(`Al archivo le faltan estas columnas: ${columnasFaltantes.join(', ')}`);
        setCargando(false);
        return;
      }
      if (filas.length === 0) {
        setError('El archivo no tiene filas de datos');
        setCargando(false);
        return;
      }

      setFilasCrudas(filas);

      const response = await fetch('/api/productos/importar', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ centroCostoId, dryRun: true, filas }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || 'Error al leer el archivo');
        return;
      }
      setPreview(data);
      setPaginaIncluidas(1);
      setPaginaExcluidas(1);
    } catch (err) {
      console.error('Error al leer el Excel:', err);
      setError('No se pudo leer el archivo. Verifica que sea un Excel válido (.xlsx).');
    } finally {
      setCargando(false);
    }
  };

  const handleToggleExcluir = (fila: number) => {
    setFilasExcluidas((prev) => {
      const next = new Set(prev);
      if (next.has(fila)) next.delete(fila);
      else next.add(fila);
      return next;
    });
  };

  const handleConfirmar = async () => {
    if (!filasCrudas) return;
    setCargando(true);
    setError('');

    const filasAImportar = filasCrudas.filter((f) => !filasExcluidas.has(f.fila));

    const lotes: FilaImportacionCruda[][] = [];
    for (let i = 0; i < filasAImportar.length; i += TAMANIO_LOTE) {
      lotes.push(filasAImportar.slice(i, i + TAMANIO_LOTE));
    }

    let importadosTotal = 0;
    let erroresTotal: ErrorGuardado[] = [];

    try {
      for (let i = 0; i < lotes.length; i++) {
        setProgreso({ loteActual: i + 1, totalLotes: lotes.length });

        const response = await fetch('/api/productos/importar', {
          method: 'POST',
          headers: authHeaders(),
          body: JSON.stringify({ centroCostoId, dryRun: false, filas: lotes[i] }),
        });

        const data = await response.json();

        if (!response.ok) {
          // No se pierde lo ya importado: se reporta con precisión en qué
          // lote se detuvo, y el usuario puede volver a subir el mismo
          // archivo - lo ya guardado quedará marcado como "posible
          // duplicado exacto" en vez de volver a duplicarse a ciegas.
          setError(
            `Se importaron ${importadosTotal} productos antes de que ocurriera un error en el lote ${i + 1} de ${lotes.length}: ${data.error || 'error desconocido'}. Revisa antes de volver a subir el archivo, ya que ahora se importa todo sin bloquear duplicados.`
          );
          if (importadosTotal > 0) onImportado();
          return;
        }

        importadosTotal += data.importados;
        erroresTotal = erroresTotal.concat(data.erroresAlGuardar || []);
      }

      setResultado({
        totalFilas: filasCrudas.length,
        importados: importadosTotal,
        excluidos: filasExcluidas.size,
        erroresAlGuardar: erroresTotal,
      });
      setPreview(null);
      onImportado();
    } catch (err) {
      console.error('Error al importar:', err);
      setError(
        `Se importaron ${importadosTotal} productos antes de perder conexión con el servidor. Vuelve a subir el mismo archivo para completar el resto.`
      );
      if (importadosTotal > 0) onImportado();
    } finally {
      setCargando(false);
      setProgreso(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)} className="flex items-center gap-2 flex-1 sm:flex-none">
        <FileSpreadsheet className="h-4 w-4" />
        <span className="hidden sm:inline">Importar</span>
        <span className="sm:hidden">Excel</span>
      </Button>

      <DialogContent className="sm:max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Importar productos desde Excel</DialogTitle>
          <DialogDescription>
            {centroCostoNombre
              ? <>Todos los productos del archivo se agregarán a la agencia <strong>{centroCostoNombre}</strong>, sin restricciones.</>
              : 'Selecciona el archivo con la plantilla oficial de importación.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Button type="button" variant="secondary" size="sm" onClick={generarPlantillaImportacion}>
            <Download className="h-4 w-4 mr-2" />
            Descargar plantilla
          </Button>

          {!resultado && (
            <input
              ref={inputRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={handleArchivo}
              disabled={cargando}
              className="block w-full text-sm border rounded-md p-2"
            />
          )}

          {cargando && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Loader2 className="h-4 w-4 animate-spin" />
              {progreso ? `Importando lote ${progreso.loteActual} de ${progreso.totalLotes}...` : 'Procesando archivo...'}
            </div>
          )}

          {error && (
            <div className="flex items-start gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-md p-3">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {preview && !resultado && (
            <div className="space-y-3">
              <div className="flex gap-2 flex-wrap">
                <Badge variant="secondary">Total filas: {preview.totalFilas}</Badge>
                <Badge className="bg-green-600">Se importarán: {incluidas.length}</Badge>
                {filasExcluidas.size > 0 && (
                  <Badge variant="outline">Excluidas por ti: {filasExcluidas.size}</Badge>
                )}
                {preview.conPosibleDuplicado > 0 && (
                  <Badge className="bg-amber-500">Posibles duplicados: {preview.conPosibleDuplicado}</Badge>
                )}
              </div>

              {incluidas.length > 0 && (
                <div className="border rounded-md overflow-hidden">
                  <div className="bg-green-50 text-green-800 text-xs font-medium px-3 py-2 flex items-center justify-between">
                    <span>Vista previa de productos a importar</span>
                    <span className="flex items-center gap-1 text-amber-700 font-normal">
                      <AlertTriangle className="h-3 w-3" /> = posible duplicado, revisa antes de confirmar
                    </span>
                  </div>
                  <div className="max-h-56 overflow-y-auto text-xs">
                    <table className="w-full">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr>
                          <th className="text-left px-2 py-1">Referencia</th>
                          <th className="text-left px-2 py-1">Producto</th>
                          <th className="text-left px-2 py-1">Cant.</th>
                          <th className="text-left px-2 py-1">Unidades</th>
                          <th className="text-left px-2 py-1">Proveedor</th>
                          <th className="text-left px-2 py-1">Sección</th>
                          <th className="px-2 py-1"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {incluidas
                          .slice((paginaIncluidas - 1) * TAMANIO_PAGINA, paginaIncluidas * TAMANIO_PAGINA)
                          .map((f) => (
                            <tr key={f.fila} className={f.posibleDuplicado ? 'bg-orange-50' : undefined}>
                              <td className="px-2 py-1">
                                <span className="flex items-center gap-1" title={f.posibleDuplicado?.motivo}>
                                  {f.posibleDuplicado && <AlertTriangle className="h-3 w-3 text-amber-600 shrink-0" />}
                                  {f.referencia}
                                </span>
                                {f.posibleDuplicado && (
                                  <div className="text-gray-500 mt-0.5">
                                    {tituloAviso(f.posibleDuplicado.tipo)} — comparado con{' '}
                                    {f.posibleDuplicado.comparadoCon.origen === 'base de datos'
                                      ? 'uno ya guardado'
                                      : `la fila ${f.posibleDuplicado.comparadoCon.fila} de este archivo`}
                                  </div>
                                )}
                              </td>
                              <td className="px-2 py-1">{f.producto}</td>
                              <td className="px-2 py-1">{f.cantidad}</td>
                              <td className="px-2 py-1">{f.unidades}</td>
                              <td className="px-2 py-1">{f.proveedor}</td>
                              <td className="px-2 py-1">{f.seccion}</td>
                              <td className="px-2 py-1">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="h-5 w-5 p-0 text-gray-400 hover:text-red-600"
                                  title="No importar este producto"
                                  onClick={() => handleToggleExcluir(f.fila)}
                                  disabled={cargando}
                                >
                                  <Minus className="h-3 w-3" />
                                </Button>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                  <Pager pagina={paginaIncluidas} totalPaginas={Math.ceil(incluidas.length / TAMANIO_PAGINA)} onCambiar={setPaginaIncluidas} />
                </div>
              )}

              {excluidas.length > 0 && (
                <div className="border border-gray-200 rounded-md overflow-hidden">
                  <div className="bg-gray-50 text-gray-700 text-xs font-medium px-3 py-2">
                    Excluidas por ti (no se importarán)
                  </div>
                  <div className="max-h-40 overflow-y-auto text-sm divide-y">
                    {excluidas
                      .slice((paginaExcluidas - 1) * TAMANIO_PAGINA, paginaExcluidas * TAMANIO_PAGINA)
                      .map((f) => (
                        <div key={f.fila} className="px-3 py-1.5 flex items-center justify-between gap-3">
                          <span className="text-gray-600 truncate">Fila {f.fila} · {f.producto} · Ref: {f.referencia}</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-xs shrink-0"
                            onClick={() => handleToggleExcluir(f.fila)}
                            disabled={cargando}
                          >
                            Deshacer
                          </Button>
                        </div>
                      ))}
                  </div>
                  <Pager pagina={paginaExcluidas} totalPaginas={Math.ceil(excluidas.length / TAMANIO_PAGINA)} onCambiar={setPaginaExcluidas} />
                </div>
              )}
            </div>
          )}

          {resultado && (
            <div className="flex items-start gap-2 text-sm text-green-800 bg-green-50 border border-green-200 rounded-md p-3">
              <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" />
              <div>
                <p>Se importaron <strong>{resultado.importados}</strong> de {resultado.totalFilas} filas.</p>
                {resultado.excluidos > 0 && <p className="text-gray-600 mt-1">{resultado.excluidos} las excluiste manualmente.</p>}
                {resultado.erroresAlGuardar.length > 0 && (
                  <p className="text-red-700 mt-1">{resultado.erroresAlGuardar.length} filas tuvieron un error inesperado al guardar.</p>
                )}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          {preview && !resultado && (
            <Button onClick={handleConfirmar} disabled={cargando || incluidas.length === 0} className="flex items-center gap-2">
              {cargando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              Confirmar importación de {incluidas.length} productos
            </Button>
          )}
          {resultado && <Button onClick={() => handleOpenChange(false)}>Cerrar</Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
