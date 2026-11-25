import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { desencriptarCosto } from '@/lib/encryption';
import { generarCodigoBarrasUnico } from '@/lib/barcode-generator';
import { verifyToken } from '@/lib/jwt';
import { usuarioTieneAccesoACentro } from '@/lib/user-centros';
import {
  esPrecioMenorQueCosto,
  registrarAlertaPrecioMenorCosto,
  resolverAlertasPrecioMenorCosto,
} from '@/lib/historial-alertas';
import { registrarMovimientoCosto } from '@/lib/movimientos-inventario';

// GET - Obtener un producto por ID (con validación de centro de costo)
export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

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

    const usuario = await prisma.usuario.findUnique({
      where: { id: payload.userId }
    });

    if (!usuario) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      );
    }

    const producto = await prisma.producto.findUnique({
      where: { id },
      include: {
        centroCosto: true,
        creadoPor: {
          select: {
            id: true,
            nombre: true,
            email: true,
            rol: true,
          }
        },
        editadoPor: {
          select: {
            id: true,
            nombre: true,
            email: true,
            rol: true,
          }
        },
      }
    });

    if (!producto) {
      return NextResponse.json(
        { error: 'Producto no encontrado' },
        { status: 404 }
      );
    }

    // Validar acceso: SuperAdmin ve todo; Admin/Asesor solo productos de
    // alguno de sus centros asignados (principal o adicionales)
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
    console.error('Error al obtener producto:', error);
    return NextResponse.json(
      { error: 'Error al obtener producto' },
      { status: 500 }
    );
  }
}

// PUT - Actualizar un producto
export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

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

    const [usuario, productoActual] = await Promise.all([
      prisma.usuario.findUnique({ where: { id: userId } }),
      prisma.producto.findUnique({ where: { id } }),
    ]);

    if (!usuario) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      );
    }

    if (!productoActual) {
      return NextResponse.json(
        { error: 'Producto no encontrado' },
        { status: 404 }
      );
    }

    if (usuario.rol !== 'superadmin') {
      const tieneAcceso =
        productoActual.centroCostoId &&
        (await usuarioTieneAccesoACentro(usuario, productoActual.centroCostoId));
      if (!tieneAcceso) {
        return NextResponse.json(
          { error: 'No tienes permiso para editar este producto' },
          { status: 403 }
        );
      }
    }

    const costoReal = desencriptarCosto(body.costo);
    const precioVentaNum = parseFloat(body.precioVenta);

    const cantidad = parseFloat(body.cantidad);

    // Del conteo físico: si no viene en el body (p. ej. el flujo de
    // "agregar cantidad", que no conoce este campo), se conserva el valor
    // que ya tenía - nunca se borra por omisión. Si viene, se acota entre 0
    // y la cantidad total en vez de rechazar el guardado por esto.
    const cantidadDanadaNum =
      body.cantidadDanada !== undefined
        ? Math.min(Math.max(0, parseFloat(body.cantidadDanada) || 0), cantidad)
        : productoActual.cantidadDanada;

    const anioActual = new Date().getFullYear();
    const cantidadCambio = !isNaN(cantidad) && cantidad !== productoActual.cantidad;

    // "Se acaba de contar" = pasó de 0 a una cantidad positiva. Un
    // ajuste normal de stock (sumar/restar) sobre un producto que ya
    // tenía cantidad NO cuenta para esto - ver ultimoConteoAt en
    // schema.prisma.
    const esConteoDesdeCero = productoActual.cantidad === 0 && cantidad > 0;

    const costoCambio = !!body.costo && body.costo.trim().toUpperCase() !== productoActual.costo;
    const precioVentaCambio = body.precioVenta !== undefined && body.precioVenta !== productoActual.precioVenta;
    const codigoCambio = body.codigo !== undefined && body.codigo !== productoActual.codigo;

    // El chequeo de precio/costo solo se hace cuando de verdad se está
    // tocando el costo o el precio en esta edición - así no bloquea (ni
    // vuelve a registrar) ediciones que no los tocan, como "agregar
    // cantidad" sobre un producto que ya tenía este problema desde antes.
    const precioMenorQueCosto =
      (costoCambio || precioVentaCambio) && esPrecioMenorQueCosto(precioVentaNum, costoReal);

    if (precioMenorQueCosto && !body.confirmarPrecioMenorCosto) {
      return NextResponse.json(
        {
          error: 'El precio de venta es menor al costo registrado. Revísalo antes de continuar.',
          precioMenorCosto: true,
        },
        { status: 409 }
      );
    }

    // Para la bitácora de movimientos de valor (ver lib/movimientos-inventario.ts)
    // interesa el valor NUMÉRICO real, no la cadena de letras - dos costos
    // escritos distinto pueden desencriptar al mismo número (ceros a la
    // izquierda), y eso no debería registrarse como un movimiento.
    const costoRealCambio = costoReal !== productoActual.costoReal;

    // Si esta misma edición toca el costo o el precio y con eso el precio
    // vuelve a quedar en >= costo, se considera corregido - se resuelve
    // solo, sin importar qué rol hizo el arreglo.
    const precioYaCorregido =
      (costoCambio || precioVentaCambio) && !esPrecioMenorQueCosto(precioVentaNum, costoReal);

    const nuevoCodigoBarras = (costoCambio || codigoCambio)
      ? await generarCodigoBarrasUnico(body.codigo, body.costo, prisma)
      : undefined;

    const producto = await prisma.producto.update({
      where: { id },
      data: {
        proveedor: body.proveedor.trim().toUpperCase(),
        referencia: body.referencia.trim().toUpperCase(),
        producto: body.producto.trim().toUpperCase(),
        cantidad: cantidad,
        cantidadDanada: cantidadDanadaNum,
        unidades: body.unidades.trim().toUpperCase(),
        seccion: body.seccion ? body.seccion.trim().toUpperCase() : productoActual.seccion,
        costo: body.costo.trim().toUpperCase(),
        costoReal: costoReal,
        precioVenta: body.precioVenta,
        codigo: body.codigo,
        embalaje: body.embalaje ? body.embalaje.trim().toUpperCase() : null,
        // El superadmin no cuenta para la columna "Creado / Editado por" -
        // si edita el producto, se deja intacto a quien lo haya tocado antes
        // (admin/asesor), o sin editar si todavía nadie lo había tocado.
        ...(usuario.rol !== 'superadmin' ? { editadoPorId: userId } : {}),
        ...(cantidadCambio ? { anioInventario: anioActual } : {}),
        ...(esConteoDesdeCero ? { ultimoConteoAt: new Date() } : {}),
        ...(nuevoCodigoBarras ? { codigoBarras: nuevoCodigoBarras } : {}),
        // NO cambiar centroCostoId al editar
      },
      include: {
        centroCosto: true,
        creadoPor: {
          select: {
            nombre: true,
            email: true,
          }
        },
        editadoPor: {
          select: {
            nombre: true,
            email: true,
          }
        }
      }
    });

    if (precioMenorQueCosto) {
      await registrarAlertaPrecioMenorCosto({
        productoId: producto.id,
        centroCostoId: producto.centroCostoId,
        usuarioId: userId,
        costoNuevo: costoReal,
        precioVentaNuevo: precioVentaNum,
      });
    }

    if (precioYaCorregido) {
      await resolverAlertasPrecioMenorCosto({ productoId: producto.id, usuarioId: userId });
    }

    // Bitácora de movimientos de valor: solo cambios de costo (ver
    // lib/movimientos-inventario.ts) - cantidad y mercancía dañada no
    // generan movimiento, a pedido explícito. Nunca se registra en
    // ediciones que no tocan el costo (nombre, cantidad, embalaje, etc.).
    if (costoRealCambio) {
      await registrarMovimientoCosto({
        productoId: producto.id,
        productoNombre: producto.producto,
        productoReferencia: producto.referencia,
        proveedor: producto.proveedor,
        seccion: producto.seccion,
        centroCostoId: producto.centroCostoId,
        usuarioId: userId,
        costoAnterior: productoActual.costoReal,
        costoNuevo: costoReal,
        cantidadActual: cantidad,
      });
    }

    return NextResponse.json(producto);
  } catch (error: any) {
    console.error('Error al actualizar producto:', error);

    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'Producto no encontrado' },
        { status: 404 }
      );
    }

    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Ya existe un producto con ese código' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Error al actualizar producto' },
      { status: 500 }
    );
  }
}

// DELETE - Eliminar un producto
export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

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

    const [usuario, producto] = await Promise.all([
      prisma.usuario.findUnique({ where: { id: payload.userId } }),
      prisma.producto.findUnique({ where: { id } }),
    ]);

    if (!usuario) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      );
    }

    if (!producto) {
      return NextResponse.json(
        { error: 'Producto no encontrado' },
        { status: 404 }
      );
    }

    if (usuario.rol !== 'superadmin') {
      const tieneAcceso =
        producto.centroCostoId && (await usuarioTieneAccesoACentro(usuario, producto.centroCostoId));
      if (!tieneAcceso) {
        return NextResponse.json(
          { error: 'No tienes permiso para eliminar este producto' },
          { status: 403 }
        );
      }
    }

    await prisma.producto.delete({
      where: { id }
    });

    return NextResponse.json({ mensaje: 'Producto eliminado correctamente' });
  } catch (error: any) {
    console.error('Error al eliminar producto:', error);

    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'Producto no encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: 'Error al eliminar producto' },
      { status: 500 }
    );
  }
}