import * as XLSX from 'xlsx';

interface Producto {
  id: string;
  proveedor: string;
  referencia: string;
  producto: string;
  cantidad: number;
  unidades: string;
  seccion?: string;
  costo: string;
  costoReal: number;
  precioVenta: string;
  codigo: string;
  codigoBarras: string;
  createdAt: string;
  centroCosto?: {
    id: string;
    nombre: string;
  };
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

type CampoAgrupacion = 'proveedor' | 'departamento';

function obtenerClaveGrupo(producto: Producto, campo: CampoAgrupacion): string {
  if (campo === 'proveedor') return producto.proveedor;
  return producto.seccion || 'SIN DEPARTAMENTO';
}

function agruparProductos(productos: Producto[], campo: CampoAgrupacion): Record<string, Producto[]> {
  return productos.reduce((acc, producto) => {
    const clave = obtenerClaveGrupo(producto, campo);
    if (!acc[clave]) {
      acc[clave] = [];
    }
    acc[clave].push(producto);
    return acc;
  }, {} as Record<string, Producto[]>);
}

// Los nombres de hoja de Excel no pueden superar 31 caracteres ni repetirse
// ni contener : \ / ? * [ ] - esto evita que un departamento con nombre
// largo (o dos grupos que truncados queden iguales) rompa la exportación.
function nombreHojaSeguro(nombre: string, usados: Set<string>): string {
  const base = (nombre.replace(/[:\\/?*[\]]/g, ' ').trim() || 'Grupo').slice(0, 31);
  let candidato = base;
  let contador = 2;
  while (usados.has(candidato.toUpperCase())) {
    const sufijo = ` (${contador})`;
    candidato = base.slice(0, 31 - sufijo.length) + sufijo;
    contador++;
  }
  usados.add(candidato.toUpperCase());
  return candidato;
}

/**
 * Construye el libro de Excel agrupando los productos por proveedor o por
 * departamento (sección), con una hoja por grupo y una hoja de resumen final.
 */
function construirLibroAgrupado(
  productos: Producto[],
  campo: CampoAgrupacion,
  incluirCostoReal: boolean
): XLSX.WorkBook {
  const libro = XLSX.utils.book_new();
  const productosPorGrupo = agruparProductos(productos, campo);
  const etiquetaGrupo = campo === 'proveedor' ? 'PROVEEDOR' : 'DEPARTAMENTO';
  const nombresUsados = new Set<string>();

  Object.entries(productosPorGrupo).forEach(([grupo, productosGrupo]) => {
    const nombreGrupo = grupo.charAt(0).toUpperCase() + grupo.slice(1);
    const grupoMayus = nombreGrupo.toUpperCase();
    const nombreHoja = nombreHojaSeguro(nombreGrupo, nombresUsados);

    // Calcular totales para el encabezado
    const totalProductosGrupo = productosGrupo.length;
    const totalValorCosto = incluirCostoReal
      ? productosGrupo.reduce((sum, p) => sum + p.costoReal * p.cantidad, 0)
      : 0;

    // Preparar datos de productos (sin encabezado todavía)
    const productosData = productosGrupo.map((producto, index) => {
      const fila: any = {
        '#': index + 1,
        'Código': producto.codigo,
        'Producto': producto.producto,
        'Referencia': producto.referencia,
        'Cantidad': producto.cantidad,
        'Unidades': producto.unidades.charAt(0).toUpperCase() + producto.unidades.slice(1),
        'Costo (Código)': producto.costo,
      };

      // Solo incluir costo real si es admin
      if (incluirCostoReal) {
        fila['Costo Real'] = producto.costoReal;
        fila['Valor Total'] = producto.costoReal * producto.cantidad;
      }

      fila['Precio Venta'] = parseFloat(producto.precioVenta);

      // Al agrupar por departamento se muestra el proveedor (y viceversa),
      // así cada hoja sigue mostrando la otra dimensión del producto
      if (campo === 'proveedor') {
        fila['Departamento'] = producto.seccion || 'Sin departamento';
      } else {
        fila['Proveedor'] = producto.proveedor;
      }

      // Agregar centro de costo si existe
      if (producto.centroCosto) {
        fila['Centro de Costo'] = producto.centroCosto.nombre;
      }

      fila['Registrado por'] = producto.creadoPor?.nombre || 'Sin información';
      fila['Fecha Registro'] = new Date(producto.createdAt).toLocaleDateString('es-CO');

      return fila;
    });

    // Crear la hoja SIN json_to_sheet para poder personalizar el encabezado
    const hoja = XLSX.utils.aoa_to_sheet([]);

    // Agregar encabezado personalizado (sin columnas todavía)
    XLSX.utils.sheet_add_aoa(hoja, [
      [`╔═══════════════════════════════════════════════════════════════════════════════════════════╗`],
      [`║  📦 INVENTARIO - ${etiquetaGrupo}: ${grupoMayus}`],
      [`║  ────────────────────────────────────────────────────────────────────────────────────────`],
      [`║  Total de productos: ${totalProductosGrupo}`],
    ], { origin: 'A1' });

    let currentRow = 4;

    if (incluirCostoReal) {
      XLSX.utils.sheet_add_aoa(hoja, [
        [`║  💰 Valor total inventario: $${totalValorCosto.toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`],
      ], { origin: `A${currentRow + 1}` });
      currentRow++;
    }

    XLSX.utils.sheet_add_aoa(hoja, [
      [`╚═══════════════════════════════════════════════════════════════════════════════════════════╝`],
      [], // Línea vacía
    ], { origin: `A${currentRow + 1}` });

    currentRow += 2;

    // Ahora agregar la tabla de productos con encabezados
    XLSX.utils.sheet_add_json(hoja, productosData, {
      origin: `A${currentRow + 1}`,
      skipHeader: false
    });

    // Agregar filas de totales con mejor formato
    if (incluirCostoReal) {
      const totalCantidad = productosGrupo.reduce((sum, p) => sum + p.cantidad, 0);
      const lastRow = currentRow + productosData.length + 1;

      XLSX.utils.sheet_add_aoa(hoja, [
        [], // Línea vacía
        [`═══════════════════════════════════════════════════════════════════════════════════════════`],
      ], { origin: `A${lastRow + 1}` });

      const totalRow: any = {
        '#': '🏆 TOTALES',
        'Código': '',
        'Producto': '',
        'Referencia': '',
        'Cantidad': totalCantidad,
        'Unidades': 'unidades',
        'Costo (Código)': '',
        'Costo Real': '',
        'Valor Total': totalValorCosto,
        'Precio Venta': '',
      };

      if (campo === 'proveedor') {
        totalRow['Departamento'] = '';
      } else {
        totalRow['Proveedor'] = '';
      }

      totalRow['Registrado por'] = '';
      totalRow['Fecha Registro'] = '';

      if (productosGrupo.some(p => p.centroCosto)) {
        totalRow['Centro de Costo'] = '';
      }

      XLSX.utils.sheet_add_json(hoja, [totalRow], {
        origin: `A${lastRow + 3}`,
        skipHeader: true
      });

      XLSX.utils.sheet_add_aoa(hoja, [
        [`═══════════════════════════════════════════════════════════════════════════════════════════`],
      ], { origin: `A${lastRow + 4}` });
    }

    // Ajustar ancho de columnas de forma más generosa
    const anchosColumnas = [
      { wch: 6 },   // #
      { wch: 14 },  // Código
      { wch: 35 },  // Producto (más ancho)
      { wch: 18 },  // Referencia
      { wch: 12 },  // Cantidad
      { wch: 14 },  // Unidades
      { wch: 16 },  // Costo (Código)
    ];

    if (incluirCostoReal) {
      anchosColumnas.push({ wch: 16 }); // Costo Real
      anchosColumnas.push({ wch: 18 }); // Valor Total
    }

    anchosColumnas.push({ wch: 16 }); // Precio Venta
    anchosColumnas.push({ wch: 20 }); // Departamento / Proveedor

    // Solo si hay productos con centro de costo
    if (productosGrupo.some(p => p.centroCosto)) {
      anchosColumnas.push({ wch: 20 }); // Centro de Costo
    }

    anchosColumnas.push({ wch: 28 }); // Registrado por
    anchosColumnas.push({ wch: 16 }); // Fecha Registro

    hoja['!cols'] = anchosColumnas;

    // Agregar la hoja al libro
    XLSX.utils.book_append_sheet(libro, hoja, nombreHoja);
  });

  // Agregar hoja de resumen al final (mejorada)
  if (incluirCostoReal) {
    const resumen = calcularResumenMejorado(productos, productosPorGrupo, campo);
    const hojaResumen = XLSX.utils.json_to_sheet(resumen);

    // Ajustar anchos de columna del resumen
    hojaResumen['!cols'] = [
      { wch: 40 },  // Descripción más ancha
      { wch: 28 }   // Valor más ancho
    ];

    XLSX.utils.book_append_sheet(libro, hojaResumen, '📊 Resumen');
  }

  return libro;
}

function nombreArchivoConFecha(prefijo: string): string {
  const ahora = new Date();
  const fecha = ahora.toISOString().split('T')[0];
  const hora = ahora.toTimeString().split(' ')[0].replace(/:/g, '-');
  return `${prefijo}_${fecha}_${hora}.xlsx`;
}

/**
 * Exporta productos a Excel con hojas separadas por proveedor y formato mejorado
 */
export function exportarProductosAExcel(productos: Producto[], incluirCostoReal: boolean = false) {
  const libro = construirLibroAgrupado(productos, 'proveedor', incluirCostoReal);
  XLSX.writeFile(libro, nombreArchivoConFecha('inventario'));
}

/**
 * Exporta productos a Excel con hojas separadas por departamento (sección)
 */
export function exportarProductosPorDepartamento(productos: Producto[], incluirCostoReal: boolean = false) {
  const libro = construirLibroAgrupado(productos, 'departamento', incluirCostoReal);
  XLSX.writeFile(libro, nombreArchivoConFecha('inventario_por_departamento'));
}

// Nombre de archivo seguro: sin espacios/acentos/símbolos que puedan
// romper la descarga en algunos navegadores/sistemas operativos.
function slugificar(texto: string): string {
  return texto
    .normalize('NFD').replace(/[̀-ͯ]/g, '') // quitar acentos
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toLowerCase() || 'agencia';
}

/**
 * Exporta el inventario ACTIVO (año de inventario actual) de una agencia en
 * dos archivos de Excel separados: uno agrupado por proveedor y otro
 * agrupado por departamento, cada uno con su propia hoja de resumen.
 *
 * `productos` debe venir ya filtrado a esa agencia y solo con lo vigente
 * (ver filtro `estado=activos` de /api/productos, que usa anioInventario).
 */
export function exportarInventarioPorAgencia(
  productos: Producto[],
  nombreAgencia: string,
  incluirCostoReal: boolean = false
) {
  const slug = slugificar(nombreAgencia);

  const libroProveedor = construirLibroAgrupado(productos, 'proveedor', incluirCostoReal);
  XLSX.writeFile(libroProveedor, nombreArchivoConFecha(`inventario_${slug}_por_proveedor`));

  const libroDepartamento = construirLibroAgrupado(productos, 'departamento', incluirCostoReal);
  XLSX.writeFile(libroDepartamento, nombreArchivoConFecha(`inventario_${slug}_por_departamento`));
}

/**
 * Calcula resumen mejorado del inventario (SIN total unidades)
 */
function calcularResumenMejorado(
  productos: Producto[],
  productosPorGrupo: Record<string, Producto[]>,
  campo: CampoAgrupacion
) {
  const ahora = new Date();
  const fechaFormateada = ahora.toLocaleDateString('es-CO', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  const horaFormateada = ahora.toLocaleTimeString('es-CO');
  const tituloGrupo = campo === 'proveedor' ? 'POR PROVEEDOR' : 'POR DEPARTAMENTO';

  const resumen: any[] = [
    { 'Descripción': '═══════════════════════════════════════', 'Valor': '═══════════════════════' },
    { 'Descripción': `📊 RESUMEN DE INVENTARIO ${tituloGrupo}`, 'Valor': '' },
    { 'Descripción': '═══════════════════════════════════════', 'Valor': '═══════════════════════' },
    { 'Descripción': `📅 Fecha: ${fechaFormateada}`, 'Valor': '' },
    { 'Descripción': `🕒 Hora: ${horaFormateada}`, 'Valor': '' },
    { 'Descripción': '', 'Valor': '' },
  ];

  // Total general
  const totalProductos = productos.length;
  const valorTotalGeneral = productos.reduce((sum, p) => {
    return sum + (p.costoReal * p.cantidad);
  }, 0);

  // Resumen por cada grupo (proveedor o departamento) - SIN total unidades
  Object.entries(productosPorGrupo).forEach(([grupo, productosGrupo]) => {
    const nombreGrupo = grupo.charAt(0).toUpperCase() + grupo.slice(1);
    const cantidadProductos = productosGrupo.length;

    const valorTotal = productosGrupo.reduce((sum, p) => {
      return sum + (p.costoReal * p.cantidad);
    }, 0);

    resumen.push(
      { 'Descripción': `━━━ ${nombreGrupo.toUpperCase()} ━━━`, 'Valor': '' },
      { 'Descripción': `   📦 Cantidad de productos`, 'Valor': `${cantidadProductos} productos` },
      { 'Descripción': `   💰 TOTAL INVENTARIO`, 'Valor': `$${valorTotal.toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` },
      { 'Descripción': '', 'Valor': '' }
    );
  });

  // Gran total al final (con mejor formato)
  resumen.push(
    { 'Descripción': '═══════════════════════════════════════', 'Valor': '═══════════════════════' },
    { 'Descripción': '🏆 GRAN TOTAL DE INVENTARIO', 'Valor': `$${valorTotalGeneral.toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` },
    { 'Descripción': '📊 Total de productos en sistema', 'Valor': `${totalProductos} productos` },
    { 'Descripción': '═══════════════════════════════════════', 'Valor': '═══════════════════════' },
    { 'Descripción': '', 'Valor': '' },
  );

  // Agregar resumen de productos por usuario (con mejor formato)
  resumen.push(
    { 'Descripción': '👥 PRODUCTOS REGISTRADOS POR USUARIO', 'Valor': '' },
    { 'Descripción': '───────────────────────────────────────', 'Valor': '───────────────────────' }
  );

  const productosPorUsuario = productos.reduce((acc, p) => {
    const nombreUsuario = p.creadoPor?.nombre || 'Sin información';
    if (!acc[nombreUsuario]) {
      acc[nombreUsuario] = 0;
    }
    acc[nombreUsuario]++;
    return acc;
  }, {} as Record<string, number>);

  Object.entries(productosPorUsuario)
    .sort((a, b) => b[1] - a[1]) // Ordenar por cantidad descendente
    .forEach(([usuario, cantidad]) => {
      const porcentaje = ((cantidad / totalProductos) * 100).toFixed(1);
      resumen.push({
        'Descripción': `   👤 ${usuario}`,
        'Valor': `${cantidad} productos (${porcentaje}%)`
      });
    });

  return resumen;
}

/**
 * Exporta solo productos seleccionados
 */
export function exportarProductosSeleccionados(
  productos: Producto[],
  idsSeleccionados: string[],
  incluirCostoReal: boolean = false
) {
  const productosSeleccionados = productos.filter(p => idsSeleccionados.includes(p.id));
  exportarProductosAExcel(productosSeleccionados, incluirCostoReal);
}
