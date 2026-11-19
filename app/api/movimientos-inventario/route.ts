import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/jwt';
import { derivarCentrosDeUsuario } from '@/lib/user-centros';

// GET - Listar movimientos de valor (bitácora), paginado y filtrable. Solo
// admin/superadmin - es la misma información de costo que ya está
// restringida en el resto del sistema.
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

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get('pageSize') || '20', 10) || 20));
    const centroCostoId = searchParams.get('centroCostoId');
    const desde = searchParams.get('desde'); // ISO date, opcional
    const estado = searchParams.get('estado') || 'pendientes'; // 'pendientes' | 'resueltas' | 'todos'

    // Solo costo - cualquier fila CANTIDAD/DANADO que haya quedado de
    // antes de este cambio se ignora siempre, ya no se vuelve a mostrar.
    const whereClause: Record<string, unknown> = { tipo: 'COSTO' };

    if (usuario.rol === 'superadmin') {
      if (centroCostoId && centroCostoId !== 'todos') {
        whereClause.centroCostoId = centroCostoId;
      }
    } else {
      const centrosAsignados = derivarCentrosDeUsuario(usuario);
      if (centrosAsignados.length === 0) {
        return NextResponse.json({ error: 'Usuario sin centro de costo asignado' }, { status: 403 });
      }

      if (centroCostoId && centroCostoId !== 'todos') {
        const tieneAcceso = centrosAsignados.some((c) => c.id === centroCostoId);
        if (!tieneAcceso) {
          return NextResponse.json({ error: 'No tienes acceso a ese centro de costo' }, { status: 403 });
        }
        whereClause.centroCostoId = centroCostoId;
      } else {
        whereClause.centroCostoId = { in: centrosAsignados.map((c) => c.id) };
      }
    }

    if (desde) {
      const fecha = new Date(desde);
      if (!isNaN(fecha.getTime())) {
        whereClause.createdAt = { gte: fecha };
      }
    }

    if (estado === 'pendientes') {
      whereClause.resuelto = false;
    } else if (estado === 'resueltas') {
      whereClause.resuelto = true;
    }
    // 'todos' -> sin filtro por estado

    const [movimientos, total] = await Promise.all([
      prisma.movimientoInventario.findMany({
        where: whereClause,
        orderBy: [{ createdAt: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          centroCosto: { select: { id: true, nombre: true } },
          usuario: { select: { nombre: true } },
          resueltoPor: { select: { nombre: true } },
        },
      }),
      prisma.movimientoInventario.count({ where: whereClause }),
    ]);

    return NextResponse.json({
      movimientos,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
      },
    });
  } catch (error) {
    console.error('Error al listar movimientos de inventario:', error);
    return NextResponse.json({ error: 'Error al listar movimientos de inventario' }, { status: 500 });
  }
}
