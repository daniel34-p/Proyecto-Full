import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken, extractTokenFromHeader } from '@/lib/jwt';
import { derivarCentrosDeUsuario } from '@/lib/user-centros';

const TIPOS_VALIDOS = ['proveedores', 'unidades', 'secciones'] as const;
type Tipo = (typeof TIPOS_VALIDOS)[number];

function esTipoValido(valor: unknown): valor is Tipo {
  return typeof valor === 'string' && (TIPOS_VALIDOS as readonly string[]).includes(valor);
}

// Catálogo de opciones personalizadas para los desplegables del formulario
// de productos:
// - 'secciones' (departamento): GLOBAL, igual para todos los centros de
//   costo - no depende de a qué centro(s) tenga acceso el usuario.
// - 'proveedores' y 'unidades': propios de CADA centro de costo - un
//   usuario solo puede ver/crear/borrar los del centro al que tiene acceso
//   (o cualquiera, si es superadmin), igual que ya pasa con los productos.
//
// Por eso, a diferencia de 'secciones', estas dos rutas sí necesitan saber
// quién es el usuario y a qué centros tiene acceso - una sola consulta de
// usuario (con sus relaciones ya incluidas), reusando el mismo patrón que
// el resto de la API para no repetirla.
async function usuarioTieneAccesoAlCentro(usuarioId: string, centroCostoId: string): Promise<boolean> {
  const usuario = await prisma.usuario.findUnique({
    where: { id: usuarioId },
    include: {
      centroCosto: true,
      centrosCostoAdicionales: { include: { centroCosto: true } },
    },
  });
  if (!usuario) return false;
  if (usuario.rol === 'superadmin') return true;

  const centros = derivarCentrosDeUsuario(usuario);
  return centros.some((c) => c.id === centroCostoId);
}

// GET - Trae los 3 catálogos juntos: 'secciones' siempre completo (global),
// y 'proveedores'/'unidades' solo los del centro indicado en
// ?centroCostoId=. Una sola consulta a la base de datos.
export async function GET(request: Request) {
  try {
    const token = extractTokenFromHeader(request.headers.get('authorization'));
    const payload = token ? verifyToken(token) : null;
    if (!payload) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const centroCostoId = searchParams.get('centroCostoId');

    if (!centroCostoId) {
      return NextResponse.json({ error: 'Debe indicar el centro de costo' }, { status: 400 });
    }

    const tieneAcceso = await usuarioTieneAccesoAlCentro(payload.userId, centroCostoId);
    if (!tieneAcceso) {
      return NextResponse.json({ error: 'No tienes acceso a ese centro de costo' }, { status: 403 });
    }

    const opciones = await prisma.opcionCatalogo.findMany({
      where: { OR: [{ tipo: 'secciones' }, { centroCostoId }] },
      orderBy: [{ tipo: 'asc' }, { valor: 'asc' }],
      select: { tipo: true, valor: true },
    });

    const resultado: Record<Tipo, string[]> = { proveedores: [], unidades: [], secciones: [] };
    for (const o of opciones) {
      if (esTipoValido(o.tipo)) resultado[o.tipo].push(o.valor);
    }

    return NextResponse.json(resultado);
  } catch (error) {
    console.error('Error al obtener opciones del catálogo:', error);
    return NextResponse.json({ error: 'Error al obtener opciones' }, { status: 500 });
  }
}

// POST - Agrega una opción nueva. Para 'secciones' es global (sin centro,
// cualquier usuario con sesión puede agregar - igual que antes). Para
// 'proveedores'/'unidades' hace falta centroCostoId, y el usuario debe
// tener acceso a ese centro.
export async function POST(request: Request) {
  try {
    const token = extractTokenFromHeader(request.headers.get('authorization'));
    const payload = token ? verifyToken(token) : null;
    if (!payload) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const tipo = body.tipo;
    const valor = typeof body.valor === 'string' ? body.valor.trim().toUpperCase() : '';

    if (!esTipoValido(tipo)) {
      return NextResponse.json({ error: 'Tipo de opción inválido' }, { status: 400 });
    }
    if (!valor) {
      return NextResponse.json({ error: 'El valor no puede estar vacío' }, { status: 400 });
    }

    let centroCostoId: string | null = null;
    if (tipo !== 'secciones') {
      centroCostoId = typeof body.centroCostoId === 'string' ? body.centroCostoId : null;
      if (!centroCostoId) {
        return NextResponse.json({ error: 'Debe indicar el centro de costo' }, { status: 400 });
      }
      const tieneAcceso = await usuarioTieneAccesoAlCentro(payload.userId, centroCostoId);
      if (!tieneAcceso) {
        return NextResponse.json({ error: 'No tienes acceso a ese centro de costo' }, { status: 403 });
      }
    }

    const opcion = await prisma.opcionCatalogo.create({ data: { tipo, valor, centroCostoId } });
    return NextResponse.json(opcion, { status: 201 });
  } catch (error: any) {
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'Esta opción ya existe' }, { status: 409 });
    }
    console.error('Error al agregar opción del catálogo:', error);
    return NextResponse.json({ error: 'Error al agregar la opción' }, { status: 500 });
  }
}

// DELETE - Quita una opción, identificada por tipo+valor(+centroCostoId
// para proveedores/unidades) en vez de un id, para no tener que exponer
// ids al frontend solo para esto.
export async function DELETE(request: Request) {
  try {
    const token = extractTokenFromHeader(request.headers.get('authorization'));
    const payload = token ? verifyToken(token) : null;
    if (!payload) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const tipo = body.tipo;
    const valor = typeof body.valor === 'string' ? body.valor.trim().toUpperCase() : '';

    if (!esTipoValido(tipo) || !valor) {
      return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 });
    }

    let centroCostoId: string | null = null;
    if (tipo !== 'secciones') {
      centroCostoId = typeof body.centroCostoId === 'string' ? body.centroCostoId : null;
      if (!centroCostoId) {
        return NextResponse.json({ error: 'Debe indicar el centro de costo' }, { status: 400 });
      }
      const tieneAcceso = await usuarioTieneAccesoAlCentro(payload.userId, centroCostoId);
      if (!tieneAcceso) {
        return NextResponse.json({ error: 'No tienes acceso a ese centro de costo' }, { status: 403 });
      }
    }

    // No se permite dejar un catálogo completamente vacío (ni el global de
    // secciones, ni el de un centro en particular) - el formulario de
    // productos necesita al menos una opción para mostrar en el
    // desplegable. Antes esta regla vivía solo en el frontend; se refuerza
    // también aquí.
    const restantes = await prisma.opcionCatalogo.count({ where: { tipo, centroCostoId } });
    if (restantes <= 1) {
      return NextResponse.json({ error: 'Debe haber al menos una opción' }, { status: 400 });
    }

    const resultado = await prisma.opcionCatalogo.deleteMany({ where: { tipo, valor, centroCostoId } });
    if (resultado.count === 0) {
      return NextResponse.json({ error: 'Esa opción ya no existe' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error al eliminar opción del catálogo:', error);
    return NextResponse.json({ error: 'Error al eliminar la opción' }, { status: 500 });
  }
}
