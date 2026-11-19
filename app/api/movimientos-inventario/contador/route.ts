import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/jwt';
import { derivarCentrosDeUsuario } from '@/lib/user-centros';

// GET - Cantidad de movimientos de costo sin revisar, para el número sobre
// la pestaña "Movimientos". Solo admin/superadmin. Simple count() sobre el
// índice [centroCostoId, resuelto] - no trae filas, pensado para
// refrescarse seguido sin pesar en el servidor.
export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const payload = verifyToken(token);
    if (!payload) {
      return NextResponse.json({ error: 'Token inválido' }, { status: 401 });
    }

    const usuario = await prisma.usuario.findUnique({
      where: { id: payload.userId },
      include: {
        centroCosto: true,
        centrosCostoAdicionales: { include: { centroCosto: true } },
      },
    });
    if (!usuario) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    if (usuario.rol === 'asesor') {
      return NextResponse.json({ error: 'No tienes permiso para ver esta información' }, { status: 403 });
    }

    const whereClause: Record<string, unknown> = { resuelto: false, tipo: 'COSTO' };

    if (usuario.rol !== 'superadmin') {
      const centrosAsignados = derivarCentrosDeUsuario(usuario);
      whereClause.centroCostoId = { in: centrosAsignados.map((c) => c.id) };
    }

    const pendientes = await prisma.movimientoInventario.count({ where: whereClause });

    return NextResponse.json({ pendientes });
  } catch (error) {
    console.error('Error al contar movimientos pendientes:', error);
    return NextResponse.json({ error: 'Error al contar movimientos pendientes' }, { status: 500 });
  }
}
