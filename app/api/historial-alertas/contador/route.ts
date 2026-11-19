import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/jwt';
import { derivarCentrosDeUsuario } from '@/lib/user-centros';

// GET - Cantidad de alertas pendientes, para el ícono de notificaciones del
// header. Es un simple count() sobre el índice [centroCostoId, resuelto] -
// no trae filas, pensado para refrescarse seguido sin pesar en el servidor.
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

    // Único tipo que existe en "Alertas" - cualquier fila COSTO_DISMINUIDO
    // que haya quedado de antes de este cambio se ignora siempre.
    const whereClause: Record<string, unknown> = { resuelto: false, tipo: 'PRECIO_MENOR_COSTO' };

    if (usuario.rol !== 'superadmin') {
      const centrosAsignados = derivarCentrosDeUsuario(usuario);
      whereClause.centroCostoId = { in: centrosAsignados.map((c) => c.id) };
    }

    const pendientes = await prisma.historialAlerta.count({ where: whereClause });

    return NextResponse.json({ pendientes });
  } catch (error) {
    console.error('Error al contar alertas pendientes:', error);
    return NextResponse.json({ error: 'Error al contar alertas pendientes' }, { status: 500 });
  }
}
