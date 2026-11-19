import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/jwt';
import { usuarioTieneAccesoACentro } from '@/lib/user-centros';

// PATCH - Marcar una alerta como revisada (o devolverla a pendiente).
// Solo admin/superadmin, y solo sobre alertas de su(s) propio(s) centro(s).
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
        { error: 'No tienes permisos para modificar el historial' },
        { status: 403 }
      );
    }

    const alerta = await prisma.historialAlerta.findUnique({ where: { id } });

    if (!alerta) {
      return NextResponse.json({ error: 'Alerta no encontrada' }, { status: 404 });
    }

    if (usuario.rol !== 'superadmin') {
      const tieneAcceso =
        !!alerta.centroCostoId && (await usuarioTieneAccesoACentro(usuario, alerta.centroCostoId));
      if (!tieneAcceso) {
        return NextResponse.json(
          { error: 'No tienes permiso para modificar esta alerta' },
          { status: 403 }
        );
      }
    }

    const body = await request.json();
    const resuelto = !!body.resuelto;

    const actualizada = await prisma.historialAlerta.update({
      where: { id },
      data: {
        resuelto,
        resueltoPorId: resuelto ? usuario.id : null,
        resueltoAt: resuelto ? new Date() : null,
      },
    });

    return NextResponse.json(actualizada);
  } catch (error) {
    console.error('Error al actualizar alerta del historial:', error);
    return NextResponse.json({ error: 'Error al actualizar alerta del historial' }, { status: 500 });
  }
}
