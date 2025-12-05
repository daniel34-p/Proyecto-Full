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
 * Exporta productos a Excel con hojas separadas por proveedor
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
    
    // Preparar datos para esta hoja
    const datosExcel = productosProveedor.map((producto, index) => {
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
        fila['Valor Total Costo'] = producto.costoReal * producto.cantidad;
      }

      fila['Precio de Venta'] = parseFloat(producto.precioVenta);
      fila['Registrado por'] = producto.creadoPor?.nombre || 'Sin información';
      fila['Fecha de Registro'] = new Date(producto.createdAt).toLocaleDateString('es-CO');

      return fila;
    });

    // Calcular total de valor en costo para este proveedor
    if (incluirCostoReal) {
      const totalValorCosto = productosProveedor.reduce((sum, p) => {
        return sum + (p.costoReal * p.cantidad);
      }, 0);

      // Agregar fila vacía
      datosExcel.push({});
      
      // Agregar fila de total
      datosExcel.push({
        '#': '',
        'Código': '',
        'Producto': '',
        'Referencia': '',
        'Cantidad': '',
        'Unidades': '',
        'Costo (Código)': 'TOTAL:',
        'Costo Real': '',
        'Valor Total Costo': totalValorCosto,
        'Precio de Venta': '',
        'Registrado por': '',
        'Fecha de Registro': '',
      });
    }

    // Crear hoja
    const hoja = XLSX.utils.json_to_sheet(datosExcel);

    // Ajustar ancho de columnas
    const anchosColumnas = [
      { wch: 5 },   // #
      { wch: 12 },  // Código
      { wch: 30 },  // Producto
      { wch: 15 },  // Referencia
      { wch: 10 },  // Cantidad
      { wch: 12 },  // Unidades
      { wch: 15 },  // Costo (Código)
    ];

    if (incluirCostoReal) {
      anchosColumnas.push({ wch: 15 }); // Costo Real
      anchosColumnas.push({ wch: 18 }); // Valor Total Costo
    }

    anchosColumnas.push({ wch: 18 }); // Precio de Venta
    anchosColumnas.push({ wch: 25 }); // Registrado por
    anchosColumnas.push({ wch: 15 }); // Fecha de Registro

    hoja['!cols'] = anchosColumnas;

    // Agregar la hoja al libro
    XLSX.utils.book_append_sheet(libro, hoja, nombreHoja);
  });

  // Agregar hoja de resumen al final
  if (incluirCostoReal) {
    const resumen = calcularResumenMejorado(productos, productosPorProveedor);
    const hojaResumen = XLSX.utils.json_to_sheet(resumen);
    hojaResumen['!cols'] = [{ wch: 35 }, { wch: 25 }];
    XLSX.utils.book_append_sheet(libro, hojaResumen, 'Resumen');
  }

  // Generar nombre de archivo con fecha
  const fecha = new Date().toISOString().split('T')[0];
  const nombreArchivo = `inventario_${fecha}.xlsx`;

  // Descargar archivo
  XLSX.writeFile(libro, nombreArchivo);
}

/**
 * Calcula resumen mejorado del inventario
 */
function calcularResumenMejorado(
  productos: Producto[], 
  productosPorProveedor: Record<string, Producto[]>
) {
  const resumen: any[] = [
    { 'Descripción': 'RESUMEN DE INVENTARIO', 'Valor': '' },
    { 'Descripción': '', 'Valor': '' },
  ];

  // Total general
  const totalProductos = productos.length;
  const valorTotalGeneral = productos.reduce((sum, p) => {
    return sum + (p.costoReal * p.cantidad);
  }, 0);

  // Resumen por cada proveedor
  Object.entries(productosPorProveedor).forEach(([proveedor, productosProveedor]) => {
    const proveedorNombre = proveedor.charAt(0).toUpperCase() + proveedor.slice(1);
    const cantidadProductos = productosProveedor.length;
    const totalUnidades = productosProveedor.reduce((sum, p) => sum + p.cantidad, 0);
    
    const valorTotal = productosProveedor.reduce((sum, p) => {
      return sum + (p.costoReal * p.cantidad);
    }, 0);

    resumen.push(
      { 'Descripción': `${proveedorNombre.toUpperCase()}`, 'Valor': '' },
      { 'Descripción': `  • Cantidad de productos`, 'Valor': cantidadProductos },
      { 'Descripción': `  • Total unidades`, 'Valor': totalUnidades },
      { 'Descripción': `  • TOTAL INVENTARIO ${proveedorNombre.toUpperCase()}`, 'Valor': `$${valorTotal.toLocaleString('es-CO', { minimumFractionDigits: 2 })}` },
      { 'Descripción': '', 'Valor': '' }
    );
  });

  // Gran total al final
  resumen.push(
    { 'Descripción': '═══════════════════════════════', 'Valor': '═════════════════' },
    { 'Descripción': 'GRAN TOTAL DE INVENTARIO', 'Valor': `$${valorTotalGeneral.toLocaleString('es-CO', { minimumFractionDigits: 2 })}` },
    { 'Descripción': 'Total de productos en sistema', 'Valor': totalProductos },
    { 'Descripción': '', 'Valor': '' },
    { 'Descripción': '', 'Valor': '' },
  );

  // Agregar resumen de productos por usuario
  resumen.push(
    { 'Descripción': 'PRODUCTOS POR USUARIO', 'Valor': '' },
    { 'Descripción': '', 'Valor': '' }
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
      resumen.push({
        'Descripción': `  • ${usuario}`,
        'Valor': `${cantidad} producto${cantidad !== 1 ? 's' : ''}`
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
};