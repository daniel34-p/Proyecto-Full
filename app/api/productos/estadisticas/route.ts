import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/jwt';
import { obtenerCentrosDeUsuario } from '@/lib/user-centros';

// GET - Estadísticas de inventario (total de productos y valor, agrupado por
// proveedor y también por departamento/sección).
//
// Solo se cuentan productos con anioInventario === año actual.
//
// SuperAdmin puede pasar ?centroCostoId=<id> para ver solo una sucursal;
// sin ese parámetro, ve el total combinado de todos los centros.
//
// Admin/Asesor multi-centro: si mandan centroCostoId (el "activo" del
// menú hamburguesa), se filtra por ese centro; si no mandan nada, se
// agregan las estadísticas de TODOS sus centros asignados.
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
    const anioActual = new Date().getFullYear();

    let whereClause: any = { anioInventario: anioActual };

    if (usuario.rol === 'superadmin') {
      if (centroCostoIdParam && centroCostoIdParam !== 'todos') {
        whereClause.centroCostoId = centroCostoIdParam;
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
        whereClause.centroCostoId = centroCostoIdParam;
      } else {
        whereClause.centroCostoId = { in: centrosAsignados.map((c) => c.id) };
      }
    }

    const productos = await prisma.producto.findMany({
      where: whereClause,
      select: { proveedor: true, seccion: true, costoReal: true, cantidad: true },
    });

    const porProveedor: Record<string, { nombre: string; totalProductos: number; valorTotal: number }> = {};
    const porDepartamento: Record<string, { nombre: string; totalProductos: number; valorTotal: number }> = {};

    for (const p of productos) {
      if (!porProveedor[p.proveedor]) {
        porProveedor[p.proveedor] = { nombre: p.proveedor, totalProductos: 0, valorTotal: 0 };
      }
      porProveedor[p.proveedor].totalProductos += 1;
      porProveedor[p.proveedor].valorTotal += p.costoReal * p.cantidad;

      const depKey = p.seccion || 'SIN DEPARTAMENTO';
      if (!porDepartamento[depKey]) {
        porDepartamento[depKey] = { nombre: depKey, totalProductos: 0, valorTotal: 0 };
      }
      porDepartamento[depKey].totalProductos += 1;
      porDepartamento[depKey].valorTotal += p.costoReal * p.cantidad;
    }

    const proveedores = Object.values(porProveedor);
    const departamentos = Object.values(porDepartamento).sort((a, b) => b.valorTotal - a.valorTotal);
    const granTotal = proveedores.reduce((sum, p) => sum + p.valorTotal, 0);

    return NextResponse.json({
      totalProductos: productos.length,
      proveedores,
      departamentos,
      granTotal,
    });
  } catch (error) {
    console.error('Error al obtener estadísticas:', error);
    return NextResponse.json(
      { error: 'Error al obtener estadísticas' },
      { status: 500 }
    );
  }
}