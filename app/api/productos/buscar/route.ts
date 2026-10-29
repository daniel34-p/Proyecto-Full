import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/jwt';
import { usuarioTieneAccesoACentro } from '@/lib/user-centros';

// GET - Busca un producto por su código de barras (usado por el escáner de
// cámara). Antes este endpoint no exigía sesión ni restringía por centro de
// costo, y devolvía el producto completo (incluido costoReal, el costo real
// desencriptado) a quien fuera - a diferencia del resto de endpoints de
// producto, que sí validan token y acceso al centro de costo (ver
// app/api/productos/[id]/route.ts). Se corrige para seguir el mismo
// patrón: exige sesión válida, y solo deja ver el producto si el usuario
// tiene acceso a su centro de costo (SuperAdmin ve todo). También se
// seleccionan solo los campos que la pantalla de "Producto Encontrado"
// (components/scanned-product-view.tsx) realmente usa, igual que ya se
// hace en /api/productos/buscar-referencia, para no filtrar costoReal.
export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const payload = verifyToken(token);
    if (!payload) {
      return NextResponse.json({ error: 'Token inválido' }, { status: 401 });
    }

    const usuario = await prisma.usuario.findUnique({ where: { id: payload.userId } });
    if (!usuario) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

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
      select: {
        id: true,
        proveedor: true,
        referencia: true,
        producto: true,
        cantidad: true,
        unidades: true,
        costo: true,
        precioVenta: true,
        codigo: true,
        codigoBarras: true,
        embalaje: true,
        centroCostoId: true,
      },
    });

    if (!producto) {
      return NextResponse.json(
        { error: 'Producto no encontrado' },
        { status: 404 }
      );
    }

    // Misma regla de acceso que el resto de endpoints de producto: un
    // admin/asesor solo puede ver productos de alguno de sus centros de
    // costo asignados (principal o adicionales); SuperAdmin ve todo.
    if (usuario.rol !== 'superadmin') {
      const tieneAcceso =
        producto.centroCostoId && (await usuarioTieneAccesoACentro(usuario, producto.centroCostoId));
      if (!tieneAcceso) {
        return NextResponse.json(
          { error: 'No tienes permiso para ver este producto' },
          { status: 403 }
        );
      }
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
