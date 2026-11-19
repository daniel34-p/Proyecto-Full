import { prisma } from '@/lib/prisma';

// Tabla aditiva (ver prisma/schema.prisma - MovimientoInventario). A
// diferencia de HistorialAlerta, esto no es una alerta que requiera
// revisión - es un registro pasivo de cada cambio de costo (suba o baje),
// para que el administrador pueda justificarle a contabilidad por qué el
// Gran Total cambió. Solo costo - cantidad y mercancía dañada no generan
// movimiento acá, a pedido explícito (no es información que se quiera
// alertar en este módulo).

export async function registrarMovimientoCosto(params: {
  productoId: string;
  productoNombre: string;
  productoReferencia: string;
  proveedor: string;
  seccion: string | null;
  centroCostoId: string | null;
  usuarioId: string;
  costoAnterior: number;
  costoNuevo: number;
  cantidadActual: number;
}) {
  // Si este mismo producto ya tenía movimientos de costo sin revisar, el
  // que se está creando ahora los deja reemplazados - revisar el costo
  // ACTUAL ya cubre todo lo anterior, así que no tiene sentido que sigan
  // apareciendo con su propio botón "Revisar" (todos llevarían al mismo
  // producto). resueltoPorId se deja en null a propósito: así se distingue
  // de un "revisado" real por un admin (ver movimientos-inventario-view.tsx).
  // Se hace al escribir (acá, una sola vez por cambio de costo) y no al
  // leer, para no tener que recalcularlo cada vez que se pide la lista o
  // el contador de pendientes.
  await prisma.movimientoInventario.updateMany({
    where: { productoId: params.productoId, tipo: 'COSTO', resuelto: false },
    data: { resuelto: true, resueltoPorId: null, resueltoAt: new Date() },
  });

  await prisma.movimientoInventario.create({
    data: {
      tipo: 'COSTO',
      productoId: params.productoId,
      productoNombre: params.productoNombre,
      productoReferencia: params.productoReferencia,
      proveedor: params.proveedor,
      seccion: params.seccion,
      centroCostoId: params.centroCostoId,
      usuarioId: params.usuarioId,
      valorAnterior: params.costoAnterior,
      valorNuevo: params.costoNuevo,
      // Si el producto no tiene cantidad en inventario, el cambio de costo
      // no mueve ni un peso el Gran Total - por eso deltaValor queda en 0
      // (se sigue mostrando el movimiento, solo que sin impacto en plata;
      // ver components/movimientos-inventario-view.tsx).
      deltaValor: (params.costoNuevo - params.costoAnterior) * params.cantidadActual,
    },
  });
}
