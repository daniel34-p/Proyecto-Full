import * as XLSX from 'xlsx';

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

/**
 * Exporta productos a Excel con hojas separadas por proveedor y formato mejorado
 */
export function exportarProductosAExcel(productos: Producto[], incluirCostoReal: boolean = false) {
  // Crear libro de Excel
  const libro = XLSX.utils.book_new();

  // Agrupar productos por proveedor
  const productosPorProveedor = productos.reduce((acc, producto) => {
    const proveedor = producto.proveedor;
    if (!acc[proveedor]) {
      acc[proveedor] = [];
    }
    acc[proveedor].push(producto);
    return acc;
  }, {} as Record<string, Producto[]>);

  // Crear una hoja por cada proveedor
  Object.entries(productosPorProveedor).forEach(([proveedor, productosProveedor]) => {
    const nombreHoja = proveedor.charAt(0).toUpperCase() + proveedor.slice(1);
    const proveedorMayus = nombreHoja.toUpperCase();
    
    // Calcular totales para el encabezado
    const totalProductosProveedor = productosProveedor.length;
    const totalCantidad = productosProveedor.reduce((sum, p) => sum + p.cantidad, 0);
    const totalValorCosto = incluirCostoReal 
      ? productosProveedor.reduce((sum, p) => sum + (p.costoReal * p.cantidad), 0)
      : 0;
    
    // Preparar array de datos
    const datosExcel: any[] = [];
    
    // Preparar datos de productos (sin encabezado todavía)
    const productosData = productosProveedor.map((producto, index) => {
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
      [`║  📦 INVENTARIO - ${proveedorMayus}`],
      [`║  ────────────────────────────────────────────────────────────────────────────────────────`],
      [`║  Total de productos: ${totalProductosProveedor}`],
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
        'Registrado por': '',
        'Fecha Registro': '',
      };

      if (productosProveedor.some(p => p.centroCosto)) {
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
    
    // Solo si hay productos con centro de costo
    if (productosProveedor.some(p => p.centroCosto)) {
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
    const resumen = calcularResumenMejorado(productos, productosPorProveedor);
    const hojaResumen = XLSX.utils.json_to_sheet(resumen);
    
    // Ajustar anchos de columna del resumen
    hojaResumen['!cols'] = [
      { wch: 40 },  // Descripción más ancha
      { wch: 28 }   // Valor más ancho
    ];
    
    XLSX.utils.book_append_sheet(libro, hojaResumen, '📊 Resumen');
  }

  // Generar nombre de archivo con fecha y hora
  const ahora = new Date();
  const fecha = ahora.toISOString().split('T')[0];
  const hora = ahora.toTimeString().split(' ')[0].replace(/:/g, '-');
  const nombreArchivo = `inventario_${fecha}_${hora}.xlsx`;

  // Descargar archivo
  XLSX.writeFile(libro, nombreArchivo);
}

/**
 * Calcula resumen mejorado del inventario (SIN total unidades)
 */
function calcularResumenMejorado(
  productos: Producto[], 
  productosPorProveedor: Record<string, Producto[]>
) {
  const ahora = new Date();
  const fechaFormateada = ahora.toLocaleDateString('es-CO', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
  const horaFormateada = ahora.toLocaleTimeString('es-CO');

  const resumen: any[] = [
    { 'Descripción': '═══════════════════════════════════════', 'Valor': '═══════════════════════' },
    { 'Descripción': '📊 RESUMEN DE INVENTARIO', 'Valor': '' },
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

  // Resumen por cada proveedor (MEJORADO - SIN total unidades)
  Object.entries(productosPorProveedor).forEach(([proveedor, productosProveedor]) => {
    const proveedorNombre = proveedor.charAt(0).toUpperCase() + proveedor.slice(1);
    const cantidadProductos = productosProveedor.length;
    
    const valorTotal = productosProveedor.reduce((sum, p) => {
      return sum + (p.costoReal * p.cantidad);
    }, 0);

    resumen.push(
      { 'Descripción': `━━━ ${proveedorNombre.toUpperCase()} ━━━`, 'Valor': '' },
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