import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPassword } from '@/lib/password';

// GET - Listar todos los usuarios
export async function GET() {
  try {
    const usuarios = await prisma.usuario.findMany({
      orderBy: {
        createdAt: 'desc'
      },
      select: {
        id: true,
        email: true,
        nombre: true,
        rol: true,
        activo: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            productosCreados: true,
            productosEditados: true,
          }
        }
      }
    });
    
    return NextResponse.json(usuarios);
  } catch (error) {
    console.error('Error al obtener usuarios:', error);
    return NextResponse.json(
      { error: 'Error al obtener usuarios' },
      { status: 500 }
    );
  }
}

// POST - Crear un nuevo usuario
export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Validaciones
    if (!body.email || !body.password || !body.nombre || !body.rol) {
      return NextResponse.json(
        { error: 'Todos los campos son requeridos' },
        { status: 400 }
      );
    }

    // Verificar que el email no exista
    const existente = await prisma.usuario.findUnique({
      where: { email: body.email }
    });

    if (existente) {
      return NextResponse.json(
        { error: 'Ya existe un usuario con ese email' },
        { status: 400 }
      );
    }

    // Hashear contraseña
    const hashedPassword = await hashPassword(body.password);
    
    const usuario = await prisma.usuario.create({
      data: {
        email: body.email,
        password: hashedPassword,
        nombre: body.nombre,
        rol: body.rol,
        activo: true,
      },
      select: {
        id: true,
        email: true,
        nombre: true,
        rol: true,
        activo: true,
        createdAt: true,
      }
    });
    
    return NextResponse.json(usuario, { status: 201 });
  } catch (error: any) {
    console.error('Error al crear usuario:', error);
    
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Ya existe un usuario con ese email' },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Error al crear usuario' },
      { status: 500 }
    );
  }
}