import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { desencriptarCosto } from '@/lib/encryption';
import { generarCodigoBarrasUnico } from '@/lib/barcode-generator';
import { verifyToken } from '@/lib/jwt';

// GET - Listar productos filtrados por centro de costo, con paginación, filtros y búsqueda
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

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);
    const pageSize = Math.min(20000, Math.max(1, parseInt(searchParams.get('pageSize') || '50', 10) || 50));
    const search = searchParams.get('search')?.trim();
    const proveedor = searchParams.get('proveedor');
    const unidades = searchParams.get('unidades');
    const seccion = searchParams.get('seccion');
    const creadoPorId = searchParams.get('creadoPorId');
    const centroCostoId = searchParams.get('centroCostoId');
    // Coincidencia exacta por referencia, usada por el flujo de "agregar cantidad"
    const referencia = searchParams.get('referencia')?.trim();

    // Construir filtro según el rol
    let whereClause: any = {};

    if (usuario.rol === 'superadmin') {
      // SuperAdmin ve TODOS los productos, opcionalmente filtrados por un centro específico
      if (centroCostoId && centroCostoId !== 'todos') {
        whereClause.centroCostoId = centroCostoId;
      }
    } else if (usuario.rol === 'admin' || usuario.rol === 'asesor') {
      // Admin y Asesor solo ven productos de su centro de costo
      if (!usuario.centroCostoId) {
        return NextResponse.json(
          { error: 'Usuario sin centro de costo asignado' },
          { status: 403 }
        );
      }
      whereClause.centroCostoId = usuario.centroCostoId;
    }

    if (proveedor && proveedor !== 'todos') whereClause.proveedor = proveedor;
    if (unidades && unidades !== 'todos') whereClause.unidades = unidades;
    if (seccion && seccion !== 'todos') whereClause.seccion = seccion;
    if (creadoPorId && creadoPorId !== 'todos') whereClause.creadoPorId = creadoPorId;
    if (referencia) whereClause.referencia = referencia.toUpperCase();

    if (search) {
      whereClause.OR = [
        { producto: { contains: search, mode: 'insensitive' } },
        { codigo: { contains: search, mode: 'insensitive' } },
        { referencia: { contains: search, mode: 'insensitive' } },
        { proveedor: { contains: search, mode: 'insensitive' } },
        { embalaje: { contains: search, mode: 'insensitive' } },
        { seccion: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Traer la página solicitada y el total en paralelo
    const [productos, total] = await Promise.all([
      prisma.producto.findMany({
        where: whereClause,
        orderBy: {
          createdAt: 'desc'
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
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
      }),
      prisma.producto.count({ where: whereClause }),
    ]);
    
    return NextResponse.json({
      productos,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
      },
    });
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
    // Verificar token en vez de confiar en un userId enviado por el cliente
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

    const userId = payload.userId;
    const body = await request.json();

    console.log('📦 Creando producto con código:', body.codigo);
    
    // Buscar usuario y generar código de barras en paralelo (son independientes)
    const [usuario, codigoBarras] = await Promise.all([
      prisma.usuario.findUnique({
        where: { id: userId },
        include: { centroCosto: true }
      }),
      generarCodigoBarrasUnico(body.codigo, body.costo, prisma),
    ]);

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
    
    // Calcular el costo real desencriptado
    const costoReal = desencriptarCosto(body.costo);
    
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
        seccion: body.seccion ? body.seccion.toUpperCase() : null,
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