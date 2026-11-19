import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/jwt';
import { derivarCentrosDeUsuario } from '@/lib/user-centros';
import { prepararAlertaParaRol } from '@/lib/historial-alertas';

// GET - Listar alertas de precio de venta por debajo del costo ("Alertas").
// Los tres roles pueden entrar, pero un asesor nunca recibe el costo
// descifrado (ver saneamiento más abajo).
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

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get('pageSize') || '20', 10) || 20));
    const centroCostoId = searchParams.get('centroCostoId');
    const estado = searchParams.get('estado') || 'pendientes'; // 'pendientes' | 'resueltas' | 'todos'

    // Único tipo que existe en "Alertas" - cualquier fila COSTO_DISMINUIDO
    // que haya quedado de antes de este cambio se ignora siempre.
    const whereClause: Record<string, unknown> = { tipo: 'PRECIO_MENOR_COSTO' };

    if (usuario.rol === 'superadmin') {
      if (centroCostoId && centroCostoId !== 'todos') {
        whereClause.centroCostoId = centroCostoId;
      }
    } else {
      const centrosAsignados = derivarCentrosDeUsuario(usuario);

      if (centrosAsignados.length === 0) {
        return NextResponse.json(
          { error: 'Usuario sin centro de costo asignado' },
          { status: 403 }
        );
      }

      if (centroCostoId && centroCostoId !== 'todos') {
        const tieneAcceso = centrosAsignados.some((c) => c.id === centroCostoId);
        if (!tieneAcceso) {
          return NextResponse.json(
            { error: 'No tienes acceso a ese centro de costo' },
            { status: 403 }
          );
        }
        whereClause.centroCostoId = centroCostoId;
      } else {
        whereClause.centroCostoId = { in: centrosAsignados.map((c) => c.id) };
      }
    }

    if (estado === 'pendientes') {
      whereClause.resuelto = false;
    } else if (estado === 'resueltas') {
      whereClause.resuelto = true;
    }
    // 'todos' -> sin filtro por estado

    const [alertas, total] = await Promise.all([
      prisma.historialAlerta.findMany({
        where: whereClause,
        orderBy: [{ createdAt: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          producto: {
            select: { id: true, producto: true, referencia: true, codigo: true },
          },
          centroCosto: { select: { id: true, nombre: true } },
          usuario: { select: { nombre: true, email: true } },
          resueltoPor: { select: { nombre: true } },
        },
      }),
      prisma.historialAlerta.count({ where: whereClause }),
    ]);

    const alertasParaRol = alertas.map((a) => prepararAlertaParaRol(a, usuario.rol));

    return NextResponse.json({
      alertas: alertasParaRol,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
      },
    });
  } catch (error) {
    console.error('Error al obtener historial de alertas:', error);
    return NextResponse.json({ error: 'Error al obtener historial de alertas' }, { status: 500 });
  }
}
