import { prisma } from '@/lib/prisma';

// Tabla aditiva (ver prisma/schema.prisma - HistorialAlerta): solo se
// escribe una fila cuando realmente se detecta algo a revisar. En un
// guardado normal (sin alertas) no se toca esta tabla.
//
// "Alertas" solo trackea precio de venta por debajo del costo - a
// contabilidad - un costo que sube o baja ya queda cubierto por el módulo
// "Movimientos" (ver lib/movimientos-inventario.ts), que es un registro
// pasivo, no una alerta que requiera acción.

export function esPrecioMenorQueCosto(precioVenta: number, costoReal: number): boolean {
  // Mientras el precio de venta siga en 0 (muchas agencias lo dejan así
  // temporalmente mientras averiguan el precio real), no tiene sentido
  // alertar ni bloquear el guardado - recién se evalúa desde $1 en adelante.
  return !isNaN(precioVenta) && precioVenta > 1 && precioVenta < costoReal;
}

export async function registrarAlertaPrecioMenorCosto(params: {
  productoId: string;
  centroCostoId: string | null;
  usuarioId: string;
  costoNuevo: number;
  precioVentaNuevo: number;
}) {
  await prisma.historialAlerta.create({
    data: {
      tipo: 'PRECIO_MENOR_COSTO',
      productoId: params.productoId,
      centroCostoId: params.centroCostoId,
      usuarioId: params.usuarioId,
      costoNuevo: params.costoNuevo,
      precioVentaNuevo: params.precioVentaNuevo,
    },
  });
}

// Se llama cuando una edición deja el precio de venta en >= costo otra vez
// (sin importar qué rol/pantalla hizo el arreglo - admin, asesor o
// superadmin pasan todos por este mismo endpoint). Resuelve de una vez
// todas las alertas pendientes de ese producto.
export async function resolverAlertasPrecioMenorCosto(params: {
  productoId: string;
  usuarioId: string;
}) {
  await prisma.historialAlerta.updateMany({
    where: { productoId: params.productoId, tipo: 'PRECIO_MENOR_COSTO', resuelto: false },
    data: {
      resuelto: true,
      resueltoPorId: params.usuarioId,
      resueltoAt: new Date(),
    },
  });
}

interface AlertaCruda {
  resuelto: boolean;
  [extra: string]: unknown;
}

// Decide qué ve cada rol de una fila de Alertas. Un asesor nunca recibe el
// costo descifrado, pero sí puede actuar (botón "Revisar") porque es el
// único tipo de alerta que existe (precio de venta por debajo del costo).
export function prepararAlertaParaRol<T extends AlertaCruda>(alerta: T, rol: string) {
  const esAsesor = rol === 'asesor';

  return {
    ...alerta,
    costoNuevo: esAsesor ? null : alerta.costoNuevo,
    puedeRevisar: !alerta.resuelto,
    // Marcar manualmente como revisado sigue siendo solo de admin/superadmin
    // - un asesor "revisa" arreglando el producto, que se autorresuelve solo.
    puedeMarcarRevisado: !esAsesor,
  };
}
