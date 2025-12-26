import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { desencriptarCosto } from '@/lib/encryption';
import { verifyToken } from '@/lib/jwt';

// GET - Obtener un producto por ID (con validación de centro de costo)
export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    
    // Extraer y verificar token
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

    // Obtener usuario
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
        creadoPor: true,
        editadoPor: true,
      }
    });
    
    if (!producto) {
      return NextResponse.json(
        { error: 'Producto no encontrado' },
        { status: 404 }
      );
    }

    // Validar acceso según centro de costo
    if (usuario.rol !== 'superadmin') {
      if (producto.centroCostoId !== usuario.centroCostoId) {
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
    const body = await request.json();
    
    const userId = body.userId;
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Usuario no identificado' },
        { status: 401 }
      );
    }

    // Obtener usuario
    const usuario = await prisma.usuario.findUnique({
      where: { id: userId }
    });

    if (!usuario) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      );
    }

    // Obtener producto actual
    const productoActual = await prisma.producto.findUnique({
      where: { id }
    });

    if (!productoActual) {
      return NextResponse.json(
        { error: 'Producto no encontrado' },
        { status: 404 }
      );
    }

    // Validar acceso según centro de costo
    if (usuario.rol !== 'superadmin') {
      if (productoActual.centroCostoId !== usuario.centroCostoId) {
        return NextResponse.json(
          { error: 'No tienes permiso para editar este producto' },
          { status: 403 }
        );
      }
    }
    
    // Calcular el costo real desencriptado
    const costoReal = desencriptarCosto(body.costo);
    
    // Convertir cantidad a float
    const cantidad = parseFloat(body.cantidad);
    
    const producto = await prisma.producto.update({
      where: { id },
      data: {
        proveedor: body.proveedor.toUpperCase(),
        referencia: body.referencia.toUpperCase(),
        producto: body.producto.toUpperCase(),
        cantidad: cantidad,
        unidades: body.unidades.toUpperCase(),
        costo: body.costo.toUpperCase(),
        costoReal: costoReal,
        precioVenta: body.precioVenta,
        codigo: body.codigo,
        embalaje: body.embalaje ? body.embalaje.toUpperCase() : null,
        editadoPorId: userId,
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
    
    // Extraer y verificar token
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

    // Obtener usuario
    const usuario = await prisma.usuario.findUnique({
      where: { id: payload.userId }
    });

    if (!usuario) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      );
    }

    // Obtener producto
    const producto = await prisma.producto.findUnique({
      where: { id }
    });

    if (!producto) {
      return NextResponse.json(
        { error: 'Producto no encontrado' },
        { status: 404 }
      );
    }

    // Validar acceso según centro de costo
    if (usuario.rol !== 'superadmin') {
      if (producto.centroCostoId !== usuario.centroCostoId) {
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