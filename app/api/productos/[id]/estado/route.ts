import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/jwt';

// PATCH - Dar de baja o reactivar un producto (no lo elimina, solo cambia
// su estado). Un producto inactivo no aparece en el listado por defecto ni
// se suma en las estadísticas de inventario.
//
// Guardar este archivo como: app/api/productos/[id]/estado/route.ts
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

    const body = await request.json();

    if (typeof body.activo !== 'boolean') {
      return NextResponse.json(
        { error: 'El campo "activo" es requerido y debe ser true o false' },
        { status: 400 }
      );
    }

    const [usuario, productoActual] = await Promise.all([
      prisma.usuario.findUnique({ where: { id: payload.userId } }),
      prisma.producto.findUnique({ where: { id } }),
    ]);

    if (!usuario) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    if (!productoActual) {
      return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 });
    }

    // Mismo control de acceso por centro de costo que el resto de endpoints
    // de productos: un admin/asesor solo puede tocar productos de su centro.
    if (usuario.rol !== 'superadmin') {
      if (productoActual.centroCostoId !== usuario.centroCostoId) {
        return NextResponse.json(
          { error: 'No tienes permiso para modificar este producto' },
          { status: 403 }
        );
      }
    }

    const producto = await prisma.producto.update({
      where: { id },
      data: {
        activo: body.activo,
        editadoPorId: payload.userId,
      },
      include: {
        centroCosto: {
          select: { id: true, nombre: true },
        },
        creadoPor: {
          select: { nombre: true, email: true },
        },
        editadoPor: {
          select: { nombre: true, email: true },
        },
      },
    });

    return NextResponse.json(producto);
  } catch (error: any) {
    console.error('Error al cambiar estado del producto:', error);

    if (error.code === 'P2025') {
      return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 });
    }

    return NextResponse.json(
      { error: 'Error al cambiar estado del producto' },
      { status: 500 }
    );
  }
}