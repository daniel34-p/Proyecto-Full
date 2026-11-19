import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/jwt';
import { usuarioTieneAccesoACentro } from '@/lib/user-centros';

// PATCH - Marcar un movimiento de costo como revisado (o devolverlo a
// pendiente). Solo admin/superadmin, y solo sobre movimientos de su(s)
// propio(s) centro(s). No hay autorresolución (a diferencia de Alertas): un
// cambio de costo no se "corrige" solo, es una confirmación manual de que
// el administrador lo vio y está bien.
export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const payload = verifyToken(token);
    if (!payload) {
      return NextResponse.json({ error: 'Token inválido' }, { status: 401 });
    }

    const usuario = await prisma.usuario.findUnique({ where: { id: payload.userId } });
    if (!usuario) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    if (usuario.rol !== 'superadmin' && usuario.rol !== 'admin') {
      return NextResponse.json(
        { error: 'No tienes permisos para modificar movimientos' },
        { status: 403 }
      );
    }

    const movimiento = await prisma.movimientoInventario.findUnique({ where: { id } });
    if (!movimiento) {
      return NextResponse.json({ error: 'Movimiento no encontrado' }, { status: 404 });
    }

    if (usuario.rol !== 'superadmin') {
      const tieneAcceso =
        !!movimiento.centroCostoId && (await usuarioTieneAccesoACentro(usuario, movimiento.centroCostoId));
      if (!tieneAcceso) {
        return NextResponse.json(
          { error: 'No tienes permiso para modificar este movimiento' },
          { status: 403 }
        );
      }
    }

    const body = await request.json();
    const resuelto = !!body.resuelto;

    const actualizado = await prisma.movimientoInventario.update({
      where: { id },
      data: {
        resuelto,
        resueltoPorId: resuelto ? usuario.id : null,
        resueltoAt: resuelto ? new Date() : null,
      },
    });

    return NextResponse.json(actualizado);
  } catch (error) {
    console.error('Error al actualizar movimiento de inventario:', error);
    return NextResponse.json({ error: 'Error al actualizar movimiento de inventario' }, { status: 500 });
  }
}
