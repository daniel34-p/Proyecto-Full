import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/jwt';
import { obtenerCentrosDeUsuario } from '@/lib/user-centros';

// GET - Devuelve los valores únicos disponibles para los filtros de la tabla
// de productos (proveedores, unidades, secciones, usuarios que han creado
// productos), respetando el/los centro(s) de costo del usuario que consulta.
//
// Un SuperAdmin puede pasar ?centroCostoId=<id> para obtener las opciones
// de una sola sucursal; sin ese parámetro, ve las opciones combinadas de
// todos los centros de costo.
//
// Un Admin/Asesor multi-centro también puede pasar ?centroCostoId=<id>
// (el centro "activo" del menú hamburguesa); sin ese parámetro, ve las
// opciones combinadas de TODOS sus centros asignados.
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

    const usuario = await prisma.usuario.findUnique({ where: { id: payload.userId } });
    if (!usuario) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const centroCostoIdParam = searchParams.get('centroCostoId');

    let whereClause: any = {};

    if (usuario.rol === 'superadmin') {
      if (centroCostoIdParam && centroCostoIdParam !== 'todos') {
        whereClause = { centroCostoId: centroCostoIdParam };
      }
    } else {
      const centrosAsignados = await obtenerCentrosDeUsuario(usuario.id);

      if (centrosAsignados.length === 0) {
        return NextResponse.json(
          { error: 'Usuario sin centro de costo asignado' },
          { status: 403 }
        );
      }

      if (centroCostoIdParam && centroCostoIdParam !== 'todos') {
        const tieneAcceso = centrosAsignados.some((c) => c.id === centroCostoIdParam);
        if (!tieneAcceso) {
          return NextResponse.json(
            { error: 'No tienes acceso a ese centro de costo' },
            { status: 403 }
          );
        }
        whereClause = { centroCostoId: centroCostoIdParam };
      } else {
        whereClause = { centroCostoId: { in: centrosAsignados.map((c) => c.id) } };
      }
    }

    const [proveedoresRaw, unidadesRaw, seccionesRaw, creadoresRaw] = await Promise.all([
      prisma.producto.findMany({
        where: whereClause,
        distinct: ['proveedor'],
        select: { proveedor: true },
        orderBy: { proveedor: 'asc' },
      }),
      prisma.producto.findMany({
        where: whereClause,
        distinct: ['unidades'],
        select: { unidades: true },
        orderBy: { unidades: 'asc' },
      }),
      prisma.producto.findMany({
        where: { ...whereClause, seccion: { not: null } },
        distinct: ['seccion'],
        select: { seccion: true },
        orderBy: { seccion: 'asc' },
      }),
      prisma.producto.findMany({
        where: { ...whereClause, creadoPorId: { not: null } },
        distinct: ['creadoPorId'],
        select: { creadoPor: { select: { id: true, nombre: true } } },
      }),
    ]);

    return NextResponse.json({
      proveedores: proveedoresRaw.map((p) => p.proveedor),
      unidades: unidadesRaw.map((u) => u.unidades),
      secciones: seccionesRaw.map((s) => s.seccion).filter(Boolean),
      creadores: creadoresRaw
        .map((c) => c.creadoPor)
        .filter((c): c is { id: string; nombre: string } => !!c),
    });
  } catch (error) {
    console.error('Error al obtener opciones de filtro:', error);
    return NextResponse.json(
      { error: 'Error al obtener opciones de filtro' },
      { status: 500 }
    );
  }
}