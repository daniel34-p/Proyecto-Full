import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { desencriptarCosto } from '@/lib/encryption';
import { generarCodigoBarrasUnico } from '@/lib/barcode-generator';
import { verifyToken } from '@/lib/jwt';
import { usuarioTieneAccesoACentro } from '@/lib/user-centros';

// GET - Obtener un producto por ID (con validación de centro de costo)
export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    const payload = verifyToken(token);
    if (!payload) {
      return NextResponse.json(
        { error: 'Token inválido' },
        { status: 401 }
      );
    }

    const usuario = await prisma.usuario.findUnique({
      where: { id: payload.userId }
    });

    if (!usuario) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      );
    }

    const producto = await prisma.producto.findUnique({
      where: { id },
      include: {
        centroCosto: true,
        creadoPor: {
          select: {
            id: true,
            nombre: true,
            email: true,
            rol: true,
          }
        },
        editadoPor: {
          select: {
            id: true,
            nombre: true,
            email: true,
            rol: true,
          }
        },
      }
    });

    if (!producto) {
      return NextResponse.json(
        { error: 'Producto no encontrado' },
        { status: 404 }
      );
    }

    // Validar acceso: SuperAdmin ve todo; Admin/Asesor solo productos de
    // alguno de sus centros asignados (principal o adicionales)
    if (usuario.rol !== 'superadmin') {
      const tieneAcceso =
        producto.centroCostoId && (await usuarioTieneAccesoACentro(usuario, producto.centroCostoId));
      if (!tieneAcceso) {
        return NextResponse.json(
          { error: 'No tienes permiso para ver este producto' },
          { status: 403 }
        );
      }
    }

    return NextResponse.json(producto);
  } catch (error) {
    console.error('Error al obtener producto:', error);
    return NextResponse.json(
      { error: 'Error al obtener producto' },
      { status: 500 }
    );
  }
}

// PUT - Actualizar un producto
export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    const payload = verifyToken(token);
    if (!payload) {
      return NextResponse.json(
        { error: 'Token inválido' },
        { status: 401 }
      );
    }

    const userId = payload.userId;
    const body = await request.json();

    const [usuario, productoActual] = await Promise.all([
      prisma.usuario.findUnique({ where: { id: userId } }),
      prisma.producto.findUnique({ where: { id } }),
    ]);

    if (!usuario) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      );
    }

    if (!productoActual) {
      return NextResponse.json(
        { error: 'Producto no encontrado' },
        { status: 404 }
      );
    }

    if (usuario.rol !== 'superadmin') {
      const tieneAcceso =
        productoActual.centroCostoId &&
        (await usuarioTieneAccesoACentro(usuario, productoActual.centroCostoId));
      if (!tieneAcceso) {
        return NextResponse.json(
          { error: 'No tienes permiso para editar este producto' },
          { status: 403 }
        );
      }
    }

    const costoReal = desencriptarCosto(body.costo);

    const cantidad = parseFloat(body.cantidad);

    const anioActual = new Date().getFullYear();
    const cantidadCambio = !isNaN(cantidad) && cantidad !== productoActual.cantidad;

    const costoCambio = !!body.costo && body.costo.trim().toUpperCase() !== productoActual.costo;
    const codigoCambio = body.codigo !== undefined && body.codigo !== productoActual.codigo;

    const nuevoCodigoBarras = (costoCambio || codigoCambio)
      ? await generarCodigoBarrasUnico(body.codigo, body.costo, prisma)
      : undefined;

    const producto = await prisma.producto.update({
      where: { id },
      data: {
        proveedor: body.proveedor.trim().toUpperCase(),
        referencia: body.referencia.trim().toUpperCase(),
        producto: body.producto.trim().toUpperCase(),
        cantidad: cantidad,
        unidades: body.unidades.trim().toUpperCase(),
        seccion: body.seccion ? body.seccion.trim().toUpperCase() : productoActual.seccion,
        costo: body.costo.trim().toUpperCase(),
        costoReal: costoReal,
        precioVenta: body.precioVenta,
        codigo: body.codigo,
        embalaje: body.embalaje ? body.embalaje.trim().toUpperCase() : null,
        editadoPorId: userId,
        ...(cantidadCambio ? { anioInventario: anioActual } : {}),
        ...(nuevoCodigoBarras ? { codigoBarras: nuevoCodigoBarras } : {}),
        // NO cambiar centroCostoId al editar
      },
      include: {
        centroCosto: true,
        creadoPor: {
          select: {
            nombre: true,
            email: true,
          }
        },
        editadoPor: {
          select: {
            nombre: true,
            email: true,
          }
        }
      }
    });

    return NextResponse.json(producto);
  } catch (error: any) {
    console.error('Error al actualizar producto:', error);

    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'Producto no encontrado' },
        { status: 404 }
      );
    }

    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Ya existe un producto con ese código' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Error al actualizar producto' },
      { status: 500 }
    );
  }
}

// DELETE - Eliminar un producto
export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    const payload = verifyToken(token);
    if (!payload) {
      return NextResponse.json(
        { error: 'Token inválido' },
        { status: 401 }
      );
    }

    const [usuario, producto] = await Promise.all([
      prisma.usuario.findUnique({ where: { id: payload.userId } }),
      prisma.producto.findUnique({ where: { id } }),
    ]);

    if (!usuario) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      );
    }

    if (!producto) {
      return NextResponse.json(
        { error: 'Producto no encontrado' },
        { status: 404 }
      );
    }

    if (usuario.rol !== 'superadmin') {
      const tieneAcceso =
        producto.centroCostoId && (await usuarioTieneAccesoACentro(usuario, producto.centroCostoId));
      if (!tieneAcceso) {
        return NextResponse.json(
          { error: 'No tienes permiso para eliminar este producto' },
          { status: 403 }
        );
      }
    }

    await prisma.producto.delete({
      where: { id }
    });

    return NextResponse.json({ mensaje: 'Producto eliminado correctamente' });
  } catch (error: any) {
    console.error('Error al eliminar producto:', error);

    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'Producto no encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: 'Error al eliminar producto' },
      { status: 500 }
    );
  }
}