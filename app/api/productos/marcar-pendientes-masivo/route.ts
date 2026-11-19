import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/jwt';
import { usuarioTieneAccesoACentro } from '@/lib/user-centros';

// Acción masiva de "iniciar conteo físico": deja en rojo (pendiente) todos
// los productos con cantidad en 0 de un centro de costo, aunque su
// anioInventario ya estuviera en el año actual por algún otro motivo (por
// ejemplo, se editó otro campo sin tocar la cantidad). Solo toca las filas
// que de verdad necesitan cambiar - los productos en 0 que ya estaban en
// rojo no se actualizan, para no generar escrituras de más.
//
// GET  ?centroCostoId=x -> cuántos productos se van a marcar (para el
//      diálogo de confirmación antes de ejecutar).
// POST { centroCostoId } -> ejecuta el update masivo.
//
// Solo admin/superadmin, respetando el mismo control de acceso multi-centro
// que el resto de endpoints de productos.

async function autorizar(request: Request, centroCostoId: string | null) {
  if (!centroCostoId) {
    return { error: NextResponse.json({ error: 'centroCostoId es requerido' }, { status: 400 }) };
  }

  const authHeader = request.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '');
  if (!token) {
    return { error: NextResponse.json({ error: 'No autorizado' }, { status: 401 }) };
  }

  const payload = verifyToken(token);
  if (!payload) {
    return { error: NextResponse.json({ error: 'Token inválido' }, { status: 401 }) };
  }

  const usuario = await prisma.usuario.findUnique({ where: { id: payload.userId } });
  if (!usuario) {
    return { error: NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 }) };
  }

  if (usuario.rol === 'asesor') {
    return { error: NextResponse.json({ error: 'No tienes permiso para esta acción' }, { status: 403 }) };
  }

  const tieneAcceso = await usuarioTieneAccesoACentro(usuario, centroCostoId);
  if (!tieneAcceso) {
    return { error: NextResponse.json({ error: 'No tienes permiso sobre este centro de costo' }, { status: 403 }) };
  }

  return { usuario };
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const centroCostoId = searchParams.get('centroCostoId');

    const resultado = await autorizar(request, centroCostoId);
    if ('error' in resultado) return resultado.error;

    const anioActual = new Date().getFullYear();
    const count = await prisma.producto.count({
      where: { centroCostoId: centroCostoId!, cantidad: 0, anioInventario: anioActual },
    });

    return NextResponse.json({ count });
  } catch (error) {
    console.error('Error al contar productos a marcar como pendientes:', error);
    return NextResponse.json({ error: 'Error al contar productos' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const centroCostoId: string | null = body.centroCostoId ?? null;

    const resultado = await autorizar(request, centroCostoId);
    if ('error' in resultado) return resultado.error;
    const { usuario } = resultado;

    const anioActual = new Date().getFullYear();
    const { count } = await prisma.producto.updateMany({
      where: { centroCostoId: centroCostoId!, cantidad: 0, anioInventario: anioActual },
      data: { anioInventario: anioActual - 1, editadoPorId: usuario.id },
    });

    return NextResponse.json({ actualizados: count });
  } catch (error) {
    console.error('Error al marcar productos como pendientes:', error);
    return NextResponse.json({ error: 'Error al marcar productos como pendientes' }, { status: 500 });
  }
}
