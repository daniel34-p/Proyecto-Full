import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { desencriptarCosto } from '@/lib/encryption';
import { generarCodigoBarrasUnico } from '@/lib/barcode-generator';
import { verifyToken } from '@/lib/jwt';

// GET - Listar productos filtrados por centro de costo
export async function GET(request: Request) {
  try {
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

    // Obtener usuario completo con centro de costo
    const usuario = await prisma.usuario.findUnique({
      where: { id: payload.userId },
      include: { centroCosto: true }
    });

    if (!usuario) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      );
    }

    // Construir filtro según el rol
    let whereClause: any = {};

    if (usuario.rol === 'superadmin') {
      // SuperAdmin ve TODOS los productos
      whereClause = {};
    } else if (usuario.rol === 'admin' || usuario.rol === 'asesor') {
      // Admin y Asesor solo ven productos de su centro de costo
      if (!usuario.centroCostoId) {
        return NextResponse.json(
          { error: 'Usuario sin centro de costo asignado' },
          { status: 403 }
        );
      }
      whereClause = { centroCostoId: usuario.centroCostoId };
    }

    // Obtener productos con filtro
    const productos = await prisma.producto.findMany({
      where: whereClause,
      orderBy: {
        createdAt: 'desc'
      },
      include: {
        centroCosto: {
          select: {
            id: true,
            nombre: true,
          }
        },
        creadoPor: {
          select: {
            nombre: true,
            email: true,
            rol: true,
          }
        },
        editadoPor: {
          select: {
            nombre: true,
            email: true,
            rol: true,
          }
        }
      }
    });
    
    return NextResponse.json(productos);
  } catch (error) {
    console.error('Error al obtener productos:', error);
    return NextResponse.json(
      { error: 'Error al obtener productos' },
      { status: 500 }
    );
  }
}

// POST - Crear un nuevo producto
export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    const userId = body.userId;
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Usuario no identificado' },
        { status: 401 }
      );
    }

    // Obtener usuario con su centro de costo
    const usuario = await prisma.usuario.findUnique({
      where: { id: userId },
      include: { centroCosto: true }
    });

    if (!usuario) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      );
    }

    // Validar que el usuario tenga centro de costo (excepto superadmin)
    if (usuario.rol !== 'superadmin' && !usuario.centroCostoId) {
      return NextResponse.json(
        { error: 'Usuario sin centro de costo asignado' },
        { status: 403 }
      );
    }
    
    console.log('📦 Creando producto con código:', body.codigo);
    
    // Calcular el costo real desencriptado
    const costoReal = desencriptarCosto(body.costo);
    
    // Generar código de barras único
    const codigoBarras = await generarCodigoBarrasUnico(body.codigo, body.costo, prisma);
    
    console.log('🔢 Código de barras generado:', codigoBarras);
    
    // Convertir cantidad a float
    const cantidad = parseFloat(body.cantidad);
    
    const producto = await prisma.producto.create({
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
        codigoBarras: codigoBarras,
        embalaje: body.embalaje ? body.embalaje.toUpperCase() : null,
        creadoPorId: userId,
        centroCostoId: usuario.centroCostoId, // Asignar centro de costo del usuario
      },
      include: {
        centroCosto: {
          select: {
            id: true,
            nombre: true,
          }
        },
        creadoPor: {
          select: {
            nombre: true,
            email: true,
          }
        }
      }
    });
    
    console.log('✅ Producto creado:', producto);
    
    return NextResponse.json(producto, { status: 201 });
  } catch (error: any) {
    console.error('❌ Error al crear producto:', error);
    
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Error al generar código de barras único. Intenta de nuevo.' },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Error al crear producto' },
      { status: 500 }
    );
  }
}