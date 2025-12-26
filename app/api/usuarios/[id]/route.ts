import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPassword } from '@/lib/password';

// PUT - Actualizar usuario
export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    
    // Obtener usuario actual
    const usuarioActual = await prisma.usuario.findUnique({
      where: { id }
    });

    if (!usuarioActual) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      );
    }

    // Validar que SuperAdmin no tenga centro de costo
    if (body.rol === 'superadmin' && body.centroCostoId) {
      return NextResponse.json(
        { error: 'Los SuperAdmin no pueden tener centro de costo asignado' },
        { status: 400 }
      );
    }

    // Validar que Admin y Asesor SÍ tengan centro de costo
    if ((body.rol === 'admin' || body.rol === 'asesor') && !body.centroCostoId) {
      return NextResponse.json(
        { error: 'Admin y Asesor deben tener un centro de costo asignado' },
        { status: 400 }
      );
    }

    // Si tiene centro de costo, verificar que exista y esté activo
    if (body.centroCostoId) {
      const centroCosto = await prisma.centroCosto.findUnique({
        where: { id: body.centroCostoId }
      });

      if (!centroCosto) {
        return NextResponse.json(
          { error: 'El centro de costo seleccionado no existe' },
          { status: 400 }
        );
      }

      if (!centroCosto.activo) {
        return NextResponse.json(
          { error: 'El centro de costo seleccionado está desactivado' },
          { status: 400 }
        );
      }
    }
    
    const updateData: any = {
      nombre: body.nombre,
      rol: body.rol,
      activo: body.activo,
      centroCostoId: body.rol === 'superadmin' ? null : body.centroCostoId,
    };

    // Solo actualizar contraseña si se proporciona
    if (body.password) {
      updateData.password = await hashPassword(body.password);
    }
    
    const usuario = await prisma.usuario.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        email: true,
        nombre: true,
        rol: true,
        activo: true,
        centroCostoId: true,
        centroCosto: {
          select: {
            id: true,
            nombre: true,
          }
        },
        createdAt: true,
        updatedAt: true,
      }
    });
    
    return NextResponse.json(usuario);
  } catch (error: any) {
    console.error('Error al actualizar usuario:', error);
    
    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(
      { error: 'Error al actualizar usuario' },
      { status: 500 }
    );
  }
}

// DELETE - Eliminar usuario
export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    
    // Verificar que no sea el último super admin
    const usuario = await prisma.usuario.findUnique({
      where: { id }
    });

    if (usuario?.rol === 'superadmin') {
      const countSuperAdmins = await prisma.usuario.count({
        where: { rol: 'superadmin', activo: true }
      });

      if (countSuperAdmins <= 1) {
        return NextResponse.json(
          { error: 'No puedes eliminar el último Super Admin' },
          { status: 400 }
        );
      }
    }
    
    await prisma.usuario.delete({
      where: { id }
    });
    
    return NextResponse.json({ mensaje: 'Usuario eliminado' });
  } catch (error: any) {
    console.error('Error al eliminar usuario:', error);
    
    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      );
    }

    if (error.code === 'P2003') {
      return NextResponse.json(
        { error: 'No se puede eliminar el usuario porque tiene productos asociados' },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Error al eliminar usuario' },
      { status: 500 }
    );
  }
}