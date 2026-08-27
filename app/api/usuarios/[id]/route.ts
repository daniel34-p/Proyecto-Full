import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPassword } from '@/lib/password';
import { verifyToken } from '@/lib/jwt';

async function requireSuperAdmin(request: Request) {
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '');

  if (!token) {
    return { error: NextResponse.json({ error: 'No autorizado' }, { status: 401 }) };
  }

  const payload = verifyToken(token);
  if (!payload) {
    return { error: NextResponse.json({ error: 'Token inválido' }, { status: 401 }) };
  }

  const usuarioAutenticado = await prisma.usuario.findUnique({ where: { id: payload.userId } });

  if (!usuarioAutenticado || !usuarioAutenticado.activo) {
    return { error: NextResponse.json({ error: 'Usuario no encontrado o inactivo' }, { status: 401 }) };
  }

  if (usuarioAutenticado.rol !== 'superadmin') {
    return { error: NextResponse.json({ error: 'No tienes permisos para esta acción' }, { status: 403 }) };
  }

  return { usuarioAutenticado };
}

function mapearCentrosCosto(usuario: any) {
  const mapa = new Map<string, { id: string; nombre: string }>();
  if (usuario.centroCosto) {
    mapa.set(usuario.centroCosto.id, usuario.centroCosto);
  }
  for (const rel of usuario.centrosCostoAdicionales || []) {
    mapa.set(rel.centroCosto.id, rel.centroCosto);
  }
  return Array.from(mapa.values());
}

// PUT - Actualizar usuario (solo SuperAdmin)
export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireSuperAdmin(request);
    if (auth.error) return auth.error;

    const { id } = await context.params;
    const body = await request.json();

    const usuarioActual = await prisma.usuario.findUnique({ where: { id } });
    if (!usuarioActual) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    const centrosCostoIds: string[] = Array.isArray(body.centrosCostoIds)
      ? [...new Set(body.centrosCostoIds as string[])]
      : body.centroCostoId
      ? [body.centroCostoId]
      : [];

    if (body.rol === 'superadmin' && centrosCostoIds.length > 0) {
      return NextResponse.json(
        { error: 'Los SuperAdmin no pueden tener centro de costo asignado' },
        { status: 400 }
      );
    }

    if ((body.rol === 'admin' || body.rol === 'asesor') && centrosCostoIds.length === 0) {
      return NextResponse.json(
        { error: 'Admin y Asesor deben tener al menos un centro de costo asignado' },
        { status: 400 }
      );
    }

    // Evitar quedarse sin ningún SuperAdmin activo (igual que antes)
    if (
      usuarioActual.rol === 'superadmin' &&
      (body.rol !== 'superadmin' || body.activo === false)
    ) {
      const countSuperAdmins = await prisma.usuario.count({
        where: { rol: 'superadmin', activo: true },
      });
      if (countSuperAdmins <= 1) {
        return NextResponse.json(
          { error: 'No puedes quitar el rol o desactivar al último Super Admin' },
          { status: 400 }
        );
      }
    }

    if (centrosCostoIds.length > 0) {
      const centros = await prisma.centroCosto.findMany({
        where: { id: { in: centrosCostoIds } },
      });

      if (centros.length !== centrosCostoIds.length) {
        return NextResponse.json(
          { error: 'Uno o más centros de costo seleccionados no existen' },
          { status: 400 }
        );
      }

      const inactivo = centros.find((c) => !c.activo);
      if (inactivo) {
        return NextResponse.json(
          { error: `El centro de costo "${inactivo.nombre}" está desactivado` },
          { status: 400 }
        );
      }
    }

    const [centroPrincipalId, ...centrosAdicionalesIds] = centrosCostoIds;

    const updateData: any = {
      nombre: body.nombre,
      rol: body.rol,
      activo: body.activo,
      centroCostoId: body.rol === 'superadmin' ? null : centroPrincipalId,
    };

    if (body.password) {
      updateData.password = await hashPassword(body.password);
    }

    // Transacción: actualizar datos del usuario y reemplazar sus centros
    // adicionales de forma atómica. No toca productos ni otras tablas.
    const usuario = await prisma.$transaction(async (tx) => {
      await tx.usuarioCentroCosto.deleteMany({ where: { usuarioId: id } });

      return tx.usuario.update({
        where: { id },
        data: {
          ...updateData,
          ...(centrosAdicionalesIds.length > 0
            ? {
                centrosCostoAdicionales: {
                  create: centrosAdicionalesIds.map((cid) => ({ centroCostoId: cid })),
                },
              }
            : {}),
        },
        select: {
          id: true,
          email: true,
          nombre: true,
          rol: true,
          activo: true,
          centroCostoId: true,
          centroCosto: { select: { id: true, nombre: true } },
          centrosCostoAdicionales: {
            select: { centroCosto: { select: { id: true, nombre: true } } },
          },
          createdAt: true,
          updatedAt: true,
        },
      });
    });

    return NextResponse.json({ ...usuario, centrosCosto: mapearCentrosCosto(usuario) });
  } catch (error: any) {
    console.error('Error al actualizar usuario:', error);

    if (error.code === 'P2025') {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    return NextResponse.json({ error: 'Error al actualizar usuario' }, { status: 500 });
  }
}

// DELETE - Eliminar usuario (solo SuperAdmin) - SIN CAMBIOS
export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireSuperAdmin(request);
    if (auth.error) return auth.error;

    const { id } = await context.params;

    const usuario = await prisma.usuario.findUnique({ where: { id } });
    if (!usuario) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    if (usuario.rol === 'superadmin') {
      const countSuperAdmins = await prisma.usuario.count({
        where: { rol: 'superadmin', activo: true },
      });
      if (countSuperAdmins <= 1) {
        return NextResponse.json(
          { error: 'No puedes eliminar el último Super Admin' },
          { status: 400 }
        );
      }
    }

    await prisma.usuario.delete({ where: { id } });

    return NextResponse.json({ mensaje: 'Usuario eliminado' });
  } catch (error: any) {
    console.error('Error al eliminar usuario:', error);

    if (error.code === 'P2025') {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }
    if (error.code === 'P2003') {
      return NextResponse.json(
        { error: 'No se puede eliminar el usuario porque tiene productos asociados' },
        { status: 400 }
      );
    }

    return NextResponse.json({ error: 'Error al eliminar usuario' }, { status: 500 });
  }
}