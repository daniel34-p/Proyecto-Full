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

  const usuario = await prisma.usuario.findUnique({ where: { id: payload.userId } });

  if (!usuario || !usuario.activo) {
    return { error: NextResponse.json({ error: 'Usuario no encontrado o inactivo' }, { status: 401 }) };
  }

  if (usuario.rol !== 'superadmin') {
    return { error: NextResponse.json({ error: 'No tienes permisos para esta acción' }, { status: 403 }) };
  }

  return { usuario };
}

// Helper: arma el array "centrosCosto" (principal + adicionales, sin
// duplicados) para exponer al frontend en cada usuario.
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

// GET - Listar todos los usuarios (solo SuperAdmin)
export async function GET(request: Request) {
  try {
    const auth = await requireSuperAdmin(request);
    if (auth.error) return auth.error;

    const usuarios = await prisma.usuario.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        nombre: true,
        rol: true,
        activo: true,
        centroCostoId: true,
        centroCosto: { select: { id: true, nombre: true } },
        // NUEVO: centros adicionales, para mostrar la lista completa
        centrosCostoAdicionales: {
          select: { centroCosto: { select: { id: true, nombre: true } } },
        },
        createdAt: true,
        updatedAt: true,
        _count: {
          select: { productosCreados: true, productosEditados: true },
        },
      },
    });

    const usuariosConCentros = usuarios.map((u) => ({
      ...u,
      centrosCosto: mapearCentrosCosto(u),
    }));

    return NextResponse.json(usuariosConCentros);
  } catch (error) {
    console.error('Error al obtener usuarios:', error);
    return NextResponse.json({ error: 'Error al obtener usuarios' }, { status: 500 });
  }
}

// POST - Crear un nuevo usuario (solo SuperAdmin)
export async function POST(request: Request) {
  try {
    const auth = await requireSuperAdmin(request);
    if (auth.error) return auth.error;

    const body = await request.json();

    if (!body.email || !body.password || !body.nombre || !body.rol) {
      return NextResponse.json(
        { error: 'Todos los campos son requeridos' },
        { status: 400 }
      );
    }

    // Acepta el array nuevo (centrosCostoIds) y, por compatibilidad, el
    // campo singular viejo (centroCostoId) si algún cliente viejo lo envía.
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

    const existente = await prisma.usuario.findUnique({ where: { email: body.email } });
    if (existente) {
      return NextResponse.json(
        { error: 'Ya existe un usuario con ese email' },
        { status: 400 }
      );
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

    const hashedPassword = await hashPassword(body.password);
    const [centroPrincipalId, ...centrosAdicionalesIds] = centrosCostoIds;

    const usuario = await prisma.usuario.create({
      data: {
        email: body.email,
        password: hashedPassword,
        nombre: body.nombre,
        rol: body.rol,
        activo: true,
        centroCostoId: body.rol === 'superadmin' ? null : centroPrincipalId,
        ...(centrosAdicionalesIds.length > 0
          ? {
              centrosCostoAdicionales: {
                create: centrosAdicionalesIds.map((id) => ({ centroCostoId: id })),
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
      },
    });

    return NextResponse.json(
      { ...usuario, centrosCosto: mapearCentrosCosto(usuario) },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error al crear usuario:', error);

    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Ya existe un usuario con ese email' },
        { status: 400 }
      );
    }

    return NextResponse.json({ error: 'Error al crear usuario' }, { status: 500 });
  }
}