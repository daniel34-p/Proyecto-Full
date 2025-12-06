import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { desencriptarCosto } from '@/lib/encryption';
import { generarCodigoBarrasUnico } from '@/lib/barcode-generator';

// GET - Listar todos los productos
export async function GET() {
  try {
    const productos = await prisma.producto.findMany({
      orderBy: {
        createdAt: 'desc'
      },
      include: {
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
      },
      include: {
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