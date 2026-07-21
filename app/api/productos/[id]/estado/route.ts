import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/jwt';

// PATCH - Forzar manualmente si un producto cuenta como "actualizado" en el
// inventario del año en curso, o como "pendiente" (de un año anterior).
// Esto NO elimina el producto - solo cambia si se suma en los totales de
// proveedor/departamento. Pensado para casos donde la cantidad real no
// cambió pero igual quieres confirmar el producto, o para excluirlo
// manualmente del conteo (p.ej. se dañó, aunque técnicamente su cantidad
// en el sistema siga igual).
//
// Body esperado: { actualizar: boolean }
//   actualizar: true  -> anioInventario = año actual
//   actualizar: false -> anioInventario = año actual - 1 (queda pendiente)
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

    if (typeof body.actualizar !== 'boolean') {
      return NextResponse.json(
        { error: 'El campo "actualizar" es requerido y debe ser true o false' },
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

    const anioActual = new Date().getFullYear();
    const nuevoAnio = body.actualizar ? anioActual : anioActual - 1;

    const producto = await prisma.producto.update({
      where: { id },
      data: {
        anioInventario: nuevoAnio,
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
    console.error('Error al cambiar el año de inventario del producto:', error);

    if (error.code === 'P2025') {
      return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 });
    }

    return NextResponse.json(
      { error: 'Error al cambiar el estado del producto' },
      { status: 500 }
    );
  }
}