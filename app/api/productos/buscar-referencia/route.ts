import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/jwt';

// GET - Busca productos por referencia o nombre EN TODAS LAS AGENCIAS (no
// solo en el centro de costo del usuario), pensado para agilizar la
// creación de productos que ya existen en otra sucursal: en vez de
// llenar el formulario desde cero, el usuario busca, encuentra el
// producto en otra agencia, y el formulario se prellena con sus datos.
//
// Solo expone los campos que el usuario ya podría ver/escribir en el
// formulario de creación (proveedor, referencia, producto, unidades,
// sección, costo en letras, precio de venta, código, embalaje) - nunca
// costoReal (el valor desencriptado), para no exponer información de
// otras agencias que el usuario no debería ver.
//
// Acceso: solo admin y asesor (con centro de costo asignado). No aplica
// a SuperAdmin porque hoy no crea productos a través de este formulario.
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

    if (usuario.rol !== 'admin' && usuario.rol !== 'asesor') {
      return NextResponse.json(
        { error: 'No tienes permisos para esta búsqueda' },
        { status: 403 }
      );
    }

    if (!usuario.centroCostoId) {
      return NextResponse.json(
        { error: 'Usuario sin centro de costo asignado' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q')?.trim();

    if (!q || q.length < 2) {
      return NextResponse.json({ resultados: [] });
    }

    // Traemos coincidencias de TODAS las agencias (sin filtrar por
    // centroCostoId), limitando la cantidad de filas crudas para que la
    // agrupación de abajo sea rápida incluso si el término es muy general.
    const productos = await prisma.producto.findMany({
      where: {
        OR: [
          { referencia: { contains: q, mode: 'insensitive' } },
          { producto: { contains: q, mode: 'insensitive' } },
        ],
      },
      select: {
        proveedor: true,
        referencia: true,
        producto: true,
        unidades: true,
        seccion: true,
        costo: true,
        precioVenta: true,
        codigo: true,
        embalaje: true,
        centroCosto: { select: { nombre: true } },
      },
      take: 100,
      orderBy: { referencia: 'asc' },
    });

    // Agrupamos por proveedor+referencia+producto: el mismo producto puede
    // existir en varias agencias, y queremos mostrarlo una sola vez con la
    // lista de en cuáles ya está, no una fila repetida por agencia.
    const grupos = new Map<string, {
      proveedor: string;
      referencia: string;
      producto: string;
      unidades: string;
      seccion: string | null;
      costo: string;
      precioVenta: string;
      codigo: string;
      embalaje: string | null;
      agencias: string[];
    }>();

    for (const p of productos) {
      const clave = `${p.proveedor}|${p.referencia}|${p.producto}`;
      const nombreAgencia = p.centroCosto?.nombre || 'Sin agencia';

      if (!grupos.has(clave)) {
        grupos.set(clave, {
          proveedor: p.proveedor,
          referencia: p.referencia,
          producto: p.producto,
          unidades: p.unidades,
          seccion: p.seccion,
          costo: p.costo,
          precioVenta: p.precioVenta,
          codigo: p.codigo,
          embalaje: p.embalaje,
          agencias: [nombreAgencia],
        });
      } else {
        const grupo = grupos.get(clave)!;
        if (!grupo.agencias.includes(nombreAgencia)) {
          grupo.agencias.push(nombreAgencia);
        }
      }
    }

    // Máximo 15 sugerencias para que el desplegable siga siendo manejable.
    const resultados = Array.from(grupos.values()).slice(0, 15);

    return NextResponse.json({ resultados });
  } catch (error) {
    console.error('Error en búsqueda cruzada de productos:', error);
    return NextResponse.json(
      { error: 'Error al buscar productos' },
      { status: 500 }
    );
  }
}