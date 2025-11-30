import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const codigoBarras = searchParams.get('codigoBarras');

    if (!codigoBarras) {
      return NextResponse.json(
        { error: 'Código de barras requerido' },
        { status: 400 }
      );
    }

    const producto = await prisma.producto.findUnique({
      where: { codigoBarras },
    });

    if (!producto) {
      return NextResponse.json(
        { error: 'Producto no encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json(producto);
  } catch (error) {
    console.error('Error al buscar producto:', error);
    return NextResponse.json(
      { error: 'Error al buscar producto' },
      { status: 500 }
    );
  }
}