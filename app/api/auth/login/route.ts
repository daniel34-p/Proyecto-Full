import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyPassword } from '@/lib/password';
import { generateToken } from '@/lib/jwt';

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email y contraseña son requeridos' },
        { status: 400 }
      );
    }

    const usuario = await prisma.usuario.findUnique({
      where: { email: email.toLowerCase().trim() },
      include: {
        centroCosto: {
          select: { id: true, nombre: true, activo: true },
        },
        // Centros adicionales asignados (usuarios multi-centro)
        centrosCostoAdicionales: {
          include: {
            centroCosto: { select: { id: true, nombre: true, activo: true } },
          },
        },
      },
    });

    if (!usuario) {
      return NextResponse.json({ error: 'Credenciales inválidas' }, { status: 401 });
    }

    if (!usuario.activo) {
      return NextResponse.json(
        { error: 'Usuario desactivado. Contacta al administrador.' },
        { status: 403 }
      );
    }

    if (usuario.centroCosto && !usuario.centroCosto.activo) {
      return NextResponse.json(
        { error: 'Centro de costo desactivado. Contacta al administrador.' },
        { status: 403 }
      );
    }

    const isPasswordValid = await verifyPassword(password, usuario.password);
    if (!isPasswordValid) {
      return NextResponse.json({ error: 'Credenciales inválidas' }, { status: 401 });
    }

    const token = generateToken({
      userId: usuario.id,
      email: usuario.email,
      rol: usuario.rol,
    });

    // Lista de todos los centros de costo del usuario (principal +
    // adicionales), sin duplicados y solo los activos. El primero es el
    // centro "activo" por defecto al iniciar sesión. Para un usuario de
    // un solo centro, esta lista trae exactamente ese centro - igual que
    // antes, solo que ahora expuesto como array.
    const mapaCentros = new Map<string, { id: string; nombre: string }>();
    if (usuario.centroCosto) {
      mapaCentros.set(usuario.centroCosto.id, {
        id: usuario.centroCosto.id,
        nombre: usuario.centroCosto.nombre,
      });
    }
    for (const rel of usuario.centrosCostoAdicionales) {
      if (rel.centroCosto.activo) {
        mapaCentros.set(rel.centroCosto.id, {
          id: rel.centroCosto.id,
          nombre: rel.centroCosto.nombre,
        });
      }
    }
    const centrosCosto = Array.from(mapaCentros.values());

    return NextResponse.json({
      user: {
        id: usuario.id,
        email: usuario.email,
        nombre: usuario.nombre,
        rol: usuario.rol,
        centroCostoId: usuario.centroCostoId,
        centroCosto: usuario.centroCosto
          ? { id: usuario.centroCosto.id, nombre: usuario.centroCosto.nombre }
          : null,
        // NUEVO: lista completa de centros para el selector multi-centro
        centrosCosto,
      },
      token,
    });
  } catch (error) {
    console.error('Error en login:', error);
    return NextResponse.json({ error: 'Error en el servidor' }, { status: 500 });
  }
}