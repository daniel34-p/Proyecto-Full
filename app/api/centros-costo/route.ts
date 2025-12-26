import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/jwt';

// GET - Listar todos los centros de costo
export async function GET(request: Request) {
  try {
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

    // Solo SuperAdmin puede listar centros de costo
    if (usuario.rol !== 'superadmin') {
      return NextResponse.json(
        { error: 'No tienes permisos para ver centros de costo' },
        { status: 403 }
      );
    }

    const centrosCosto = await prisma.centroCosto.findMany({
      orderBy: {
        nombre: 'asc'
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
    
    return NextResponse.json(centrosCosto);
  } catch (error) {
    console.error('Error al obtener centros de costo:', error);
    return NextResponse.json(
      { error: 'Error al obtener centros de costo' },
      { status: 500 }
    );
  }
}

// POST - Crear un nuevo centro de costo
export async function POST(request: Request) {
  try {
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

    // Solo SuperAdmin puede crear centros de costo
    if (usuario.rol !== 'superadmin') {
      return NextResponse.json(
        { error: 'No tienes permisos para crear centros de costo' },
        { status: 403 }
      );
    }

    const body = await request.json();
    
    // Validar
    if (!body.nombre || !body.nombre.trim()) {
      return NextResponse.json(
        { error: 'El nombre del centro de costo es requerido' },
        { status: 400 }
      );
    }

    // Verificar que no exista
    const existente = await prisma.centroCosto.findUnique({
      where: { nombre: body.nombre.trim() }
    });

    if (existente) {
      return NextResponse.json(
        { error: 'Ya existe un centro de costo con ese nombre' },
        { status: 400 }
      );
    }

    const centroCosto = await prisma.centroCosto.create({
      data: {
        nombre: body.nombre.trim(),
        activo: body.activo !== undefined ? body.activo : true,
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
    
    return NextResponse.json(centroCosto, { status: 201 });
  } catch (error: any) {
    console.error('Error al crear centro de costo:', error);
    
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Ya existe un centro de costo con ese nombre' },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Error al crear centro de costo' },
      { status: 500 }
    );
  }
}