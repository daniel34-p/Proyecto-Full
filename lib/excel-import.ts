import * as XLSX from 'xlsx';

// Nombres de encabezado aceptados por campo. La comparación ignora
// mayúsculas/acentos/espacios extra, así cada agencia puede escribir el
// encabezado como ya lo tenga, en cualquier orden de columnas.
const ENCABEZADOS_POR_CAMPO: Record<string, string[]> = {
  proveedor: ['proveedor'],
  referencia: ['referencia'],
  producto: ['producto', 'nombre', 'nombre del producto'],
  cantidad: ['cantidad'],
  unidades: ['unidades', 'unidad', 'unidad de medida'],
  costo: ['costo', 'costo real', 'precio costo'],
  precioVenta: ['precio venta', 'preciodeventa', 'precio de venta'],
  seccion: ['seccion', 'departamento', 'seccion departamento', 'departamento seccion', 'seccion/departamento'],
  embalaje: ['embalaje'],
};

export type CampoFila =
  | 'proveedor'
  | 'referencia'
  | 'producto'
  | 'cantidad'
  | 'unidades'
  | 'costo'
  | 'precioVenta'
  | 'seccion'
  | 'embalaje';

export type FilaImportacionCruda = Record<CampoFila, string> & { fila: number };

function normalizarEncabezado(texto: string): string {
  return texto
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .trim()
    .toLowerCase()
    .replace(/[/\\]/g, ' ') // "Sección/Departamento" -> "seccion departamento"
    .replace(/\s+/g, ' ');
}

function construirMapaColumnas(encabezados: string[]): Partial<Record<CampoFila, number>> {
  const mapa: Partial<Record<CampoFila, number>> = {};
  const encabezadosNormalizados = encabezados.map(normalizarEncabezado);

  (Object.keys(ENCABEZADOS_POR_CAMPO) as CampoFila[]).forEach((campo) => {
    const candidatos = ENCABEZADOS_POR_CAMPO[campo];
    const indice = encabezadosNormalizados.findIndex((encabezado) =>
      candidatos.includes(encabezado)
    );
    if (indice !== -1) {
      mapa[campo] = indice;
    }
  });

  return mapa;
}

function celdaATexto(valor: unknown): string {
  if (valor === null || valor === undefined) return '';
  if (typeof valor === 'number') {
    // Evita notación científica/decimales falsos en columnas numéricas
    return Number.isInteger(valor) ? valor.toString() : valor.toString();
  }
  return String(valor).trim();
}

export interface ResultadoLecturaExcel {
  filas: FilaImportacionCruda[];
  columnasFaltantes: CampoFila[];
}

/**
 * Lee un archivo Excel subido por el usuario y devuelve las filas como
 * objetos con los nombres de campo internos, emparejando columnas por el
 * nombre de su encabezado (fila 1), sin importar el orden en que vengan.
 */
export async function leerExcelImportacion(archivo: File): Promise<ResultadoLecturaExcel> {
  const buffer = await archivo.arrayBuffer();
  const libro = XLSX.read(buffer, { type: 'array' });
  const hoja = libro.Sheets[libro.SheetNames[0]];
  const filasCrudas: unknown[][] = XLSX.utils.sheet_to_json(hoja, { header: 1, blankrows: false });

  if (filasCrudas.length === 0) {
    return { filas: [], columnasFaltantes: Object.keys(ENCABEZADOS_POR_CAMPO) as CampoFila[] };
  }

  const encabezados = (filasCrudas[0] as unknown[]).map((c) => celdaATexto(c));
  const mapaColumnas = construirMapaColumnas(encabezados);

  const camposObligatoriosParaLeer: CampoFila[] = [
    'proveedor', 'referencia', 'producto', 'cantidad', 'unidades', 'costo', 'precioVenta',
  ];
  const columnasFaltantes = camposObligatoriosParaLeer.filter((campo) => mapaColumnas[campo] === undefined);

  const filas: FilaImportacionCruda[] = filasCrudas.slice(1).map((filaCruda, indice) => {
    const fila: any = { fila: indice + 2 }; // +2: fila 1 es encabezado, Excel es 1-indexado
    (Object.keys(ENCABEZADOS_POR_CAMPO) as CampoFila[]).forEach((campo) => {
      const columna = mapaColumnas[campo];
      fila[campo] = columna !== undefined ? celdaATexto(filaCruda[columna]) : '';
    });
    return fila as FilaImportacionCruda;
  });

  return { filas, columnasFaltantes };
}

/**
 * Genera y descarga la plantilla oficial de importación, con los
 * encabezados esperados y una fila de ejemplo como guía.
 */
export function generarPlantillaImportacion() {
  const encabezados = [
    'Proveedor', 'Referencia', 'Producto', 'Cantidad', 'Unidades',
    'Costo', 'Precio Venta', 'Sección/Departamento', 'Embalaje',
  ];
  const ejemplo = [
    'BODEGA', 'REF-001', 'TELA ALGODON BLANCA', 25, 'METROS',
    15000, 35000, 'TELAS', 'ROLLO X 50M',
  ];

  const hoja = XLSX.utils.aoa_to_sheet([encabezados, ejemplo]);
  hoja['!cols'] = encabezados.map(() => ({ wch: 20 }));

  const libro = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(libro, hoja, 'Productos');
  XLSX.writeFile(libro, 'plantilla_importacion_productos.xlsx');
}
