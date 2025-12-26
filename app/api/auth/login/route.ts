import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyPassword } from '@/lib/password';
import { generateToken } from '@/lib/jwt';

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    // Validar que los campos no estén vacíos
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email y contraseña son requeridos' },
        { status: 400 }
      );
    }

    // Buscar usuario con centro de costo
    const usuario = await prisma.usuario.findUnique({
      where: { email: email.toLowerCase().trim() },
      include: {
        centroCosto: {
          select: {
            id: true,
            nombre: true,
            activo: true,
          }
        }
      }
    });

    // Verificar si existe
    if (!usuario) {
      return NextResponse.json(
        { error: 'Credenciales inválidas' },
        { status: 401 }
      );
    }

    // Verificar si el usuario está activo
    if (!usuario.activo) {
      return NextResponse.json(
        { error: 'Usuario desactivado. Contacta al administrador.' },
        { status: 403 }
      );
    }

    // Verificar si el centro de costo está activo (si aplica)
    if (usuario.centroCosto && !usuario.centroCosto.activo) {
      return NextResponse.json(
        { error: 'Centro de costo desactivado. Contacta al administrador.' },
        { status: 403 }
      );
    }

    // Verificar contraseña
    const isPasswordValid = await verifyPassword(password, usuario.password);

    if (!isPasswordValid) {
      return NextResponse.json(
        { error: 'Credenciales inválidas' },
        { status: 401 }
      );
    }

    // Generar token JWT
    const token = generateToken({
      userId: usuario.id,
      email: usuario.email,
      rol: usuario.rol,
    });

    // Retornar datos del usuario con token (incluyendo centro de costo)
    return NextResponse.json({
      user: {
        id: usuario.id,
        email: usuario.email,
        nombre: usuario.nombre,
        rol: usuario.rol,
        centroCostoId: usuario.centroCostoId,
        centroCosto: usuario.centroCosto ? {
          id: usuario.centroCosto.id,
          nombre: usuario.centroCosto.nombre,
        } : null,
      },
      token,
    });
  } catch (error) {
    console.error('Error en login:', error);
    return NextResponse.json(
      { error: 'Error en el servidor' },
      { status: 500 }
    );
  }
}