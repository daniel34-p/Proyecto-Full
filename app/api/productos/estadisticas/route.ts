import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/jwt';

// GET - Estadísticas de inventario (total de productos y valor, agrupado por
// proveedor y también por departamento/sección). Se calculan trayendo solo
// los campos numéricos necesarios (no el producto completo con relaciones),
// para que sea liviano incluso con miles de filas.
// Solo se cuentan productos activos, para que uno dado de baja (agotado o
// dañado) no infle el valor total del inventario.
//
// Un SuperAdmin puede pasar ?centroCostoId=<id> para ver las estadísticas
// de una sola sucursal (usado por la vista de "Sucursales"); sin ese
// parámetro, ve el total combinado de todos los centros de costo.
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

    let whereClause: any = { activo: true };
    if (usuario.rol !== 'superadmin') {
      if (!usuario.centroCostoId) {
        return NextResponse.json(
          { error: 'Usuario sin centro de costo asignado' },
          { status: 403 }
        );
      }
      whereClause.centroCostoId = usuario.centroCostoId;
    } else if (centroCostoIdParam && centroCostoIdParam !== 'todos') {
      // SuperAdmin consultando una sucursal específica
      whereClause.centroCostoId = centroCostoIdParam;
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

      // Productos antiguos pueden no tener departamento asignado
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