import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/jwt';

// PUT - Actualizar centro de costo (activar/desactivar)
export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    
    // Verificar autenticación
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

    // Solo SuperAdmin puede actualizar centros de costo
    if (usuario.rol !== 'superadmin') {
      return NextResponse.json(
        { error: 'No tienes permisos para actualizar centros de costo' },
        { status: 403 }
      );
    }

    const body = await request.json();

    // Verificar que el centro existe
    const centroExistente = await prisma.centroCosto.findUnique({
      where: { id }
    });

    if (!centroExistente) {
      return NextResponse.json(
        { error: 'Centro de costo no encontrado' },
        { status: 404 }
      );
    }

    // Si se está desactivando, verificar que no tenga usuarios activos asignados
    if (body.activo === false) {
      const usuariosActivos = await prisma.usuario.count({
        where: {
          centroCostoId: id,
          activo: true,
        }
      });

      if (usuariosActivos > 0) {
        return NextResponse.json(
          { error: `No se puede desactivar. Hay ${usuariosActivos} usuario(s) activo(s) asignado(s) a este centro` },
          { status: 400 }
        );
      }
    }

    const centroCosto = await prisma.centroCosto.update({
      where: { id },
      data: {
        nombre: body.nombre || centroExistente.nombre,
        activo: body.activo !== undefined ? body.activo : centroExistente.activo,
      },
      include: {
        _count: {
          select: {
            usuarios: true,
            productos: true,
          }
        }
      }
    });

    return NextResponse.json(centroCosto);
  } catch (error: any) {
    console.error('Error al actualizar centro de costo:', error);
    
    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'Centro de costo no encontrado' },
        { status: 404 }
      );
    }

    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Ya existe un centro de costo con ese nombre' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Error al actualizar centro de costo' },
      { status: 500 }
    );
  }
}

// DELETE - Eliminar centro de costo
export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    
    // Verificar autenticación
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

    // Solo SuperAdmin puede eliminar centros de costo
    if (usuario.rol !== 'superadmin') {
      return NextResponse.json(
        { error: 'No tienes permisos para eliminar centros de costo' },
        { status: 403 }
      );
    }

    // Verificar que no tenga usuarios asociados
    const usuariosCount = await prisma.usuario.count({
      where: { centroCostoId: id }
    });

    if (usuariosCount > 0) {
      return NextResponse.json(
        { error: `No se puede eliminar. Hay ${usuariosCount} usuario(s) asignado(s) a este centro` },
        { status: 400 }
      );
    }

    // Verificar que no tenga productos asociados
    const productosCount = await prisma.producto.count({
      where: { centroCostoId: id }
    });

    if (productosCount > 0) {
      return NextResponse.json(
        { error: `No se puede eliminar. Hay ${productosCount} producto(s) asignado(s) a este centro` },
        { status: 400 }
      );
    }

    await prisma.centroCosto.delete({
      where: { id }
    });

    return NextResponse.json({ mensaje: 'Centro de costo eliminado correctamente' });
  } catch (error: any) {
    console.error('Error al eliminar centro de costo:', error);
    
    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'Centro de costo no encontrado' },
        { status: 404 }
      );
    }

    if (error.code === 'P2003') {
      return NextResponse.json(
        { error: 'No se puede eliminar el centro porque tiene usuarios o productos asociados' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Error al eliminar centro de costo' },
      { status: 500 }
    );
  }
}