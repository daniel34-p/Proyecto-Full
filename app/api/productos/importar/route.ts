import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { encriptarCosto } from '@/lib/encryption';
import { generarCodigoBarras } from '@/lib/barcode-generator';
import { verifyToken } from '@/lib/jwt';
import { usuarioTieneAccesoACentro } from '@/lib/user-centros';

// Vercel corta una función serverless que tarda demasiado; con el insertado
// masivo de abajo un lote de 500 filas nunca debería acercarse a esto, pero
// se deja margen igual (60s es el máximo permitido en el plan gratuito).
export const maxDuration = 60;

// Límite defensivo (técnico, no de negocio): el frontend ya parte el
// archivo en lotes antes de enviarlo, pero si alguien llama a este endpoint
// directamente con un lote gigante, se rechaza en vez de arriesgar un
// timeout o un payload enorme. Esto se mantiene aunque ya no haya reglas de
// validación de datos - es para proteger el rendimiento, no para filtrar
// productos.
const MAX_FILAS_POR_LOTE = 1000;

interface FilaEntrada {
  fila: number;
  proveedor: string;
  referencia: string;
  producto: string;
  cantidad: string;
  unidades: string;
  costo: string;
  precioVenta: string;
  seccion: string;
  embalaje: string;
}

// Resumen liviano de un producto (propio o ya existente) usado solo para
// que el usuario pueda comparar visualmente - nunca incluye costo/costoReal,
// igual que el resto de la pantalla de importación.
interface ResumenProducto {
  proveedor: string;
  cantidad: string;
  unidades: string;
  seccion: string;
  precioVenta: string;
}

interface Comparacion extends ResumenProducto {
  origen: 'base de datos' | 'este mismo archivo';
  fila?: number; // solo cuando origen es "este mismo archivo"
}

// Aviso informativo, nunca bloquea la importación:
// - 'exacto': misma referencia Y mismo nombre que uno ya existente.
// - 'referencia': misma referencia, nombre distinto.
// - 'nombre': mismo nombre, referencia distinta.
interface PosibleDuplicado {
  tipo: 'exacto' | 'referencia' | 'nombre';
  motivo: string;
  comparadoCon: Comparacion;
}

interface RegistroEnLote extends ResumenProducto {
  fila: number;
  referencia: string;
  producto: string;
}

interface FilaLista {
  fila: number;
  data: {
    proveedor: string;
    referencia: string;
    producto: string;
    cantidad: number;
    unidades: string;
    costoReal: number;
    precioVenta: string;
    seccion: string;
    embalaje: string;
  };
  posibleDuplicado?: PosibleDuplicado;
}

interface FilaConError {
  fila: number;
  motivo: string;
}

interface ProductoExistente {
  referencia: string;
  producto: string;
  proveedor: string;
  cantidad: number;
  unidades: string;
  seccion: string | null;
  precioVenta: string;
}

function numeroOCero(texto: string): number {
  if (!texto.trim()) return 0;
  const normalizado = texto.trim().replace(/\./g, '').replace(',', '.');
  const numero = Number(normalizado);
  return Number.isFinite(numero) && numero >= 0 ? numero : 0;
}

function resumenDe(p: { proveedor: string; cantidad: number | string; unidades: string; seccion: string | null; precioVenta: string }): ResumenProducto {
  return {
    proveedor: p.proveedor,
    cantidad: String(p.cantidad),
    unidades: p.unidades,
    seccion: p.seccion || 'SIN SECCION',
    precioVenta: p.precioVenta,
  };
}

// Todo lo que clasificarFilas necesita saber sobre lo que YA existe en la
// agencia, derivado de una sola consulta a la base de datos (ver POST). Se
// pasa como un solo objeto de mapas en memoria - ninguna de las búsquedas
// de abajo vuelve a tocar la base de datos.
interface ExistentesEnAgencia {
  porClave: Map<string, ProductoExistente>; // referencia|||producto -> exacto
  porReferencia: Map<string, ProductoExistente>; // una muestra por referencia
  porNombre: Map<string, ProductoExistente>; // una muestra por nombre de producto
}

// Normaliza y rellena cada fila con los valores por defecto acordados - sin
// ninguna condición que rechace una fila: TODO insumo del archivo se
// importa. Lo único que se calcula aparte es `posibleDuplicado`, un aviso
// puramente informativo (no bloquea nada) para que el usuario pueda
// revisar antes de confirmar si sabe que es information repetida.
function clasificarFilas(filas: FilaEntrada[], existentes: ExistentesEnAgencia): FilaLista[] {
  const listas: FilaLista[] = [];

  // Espejo de `existentes`, pero acumulado con lo que ya se fue aceptando
  // DENTRO de este mismo archivo, para detectar parecidos entre filas del
  // propio Excel y no solo contra la base de datos.
  const enEsteLotePorClave = new Map<string, RegistroEnLote>();
  const enEsteLotePorReferencia = new Map<string, RegistroEnLote>();
  const enEsteLotePorNombre = new Map<string, RegistroEnLote>();

  for (const fila of filas) {
    const referencia = fila.referencia.trim().toUpperCase() || '?';
    const producto = fila.producto.trim().toUpperCase() || '?';
    const clave = `${referencia}|||${producto}`;

    const costoReal = Math.round(numeroOCero(fila.costo));
    const precioVentaNum = numeroOCero(fila.precioVenta);
    const cantidad = numeroOCero(fila.cantidad);

    const dataFinal = {
      proveedor: fila.proveedor.trim() ? fila.proveedor.trim().toUpperCase() : 'SIN PROVEEDOR',
      referencia,
      producto,
      cantidad,
      unidades: fila.unidades.trim() ? fila.unidades.trim().toUpperCase() : 'SIN UNIDAD',
      costoReal,
      precioVenta: String(precioVentaNum),
      seccion: fila.seccion.trim() ? fila.seccion.trim().toUpperCase() : 'SIN SECCION',
      embalaje: fila.embalaje.trim() ? fila.embalaje.trim().toUpperCase() : '?',
    };

    // Avisos de posible duplicación - solo tienen sentido si la referencia
    // y el nombre son datos reales (no el "?" de "sin dato").
    let posibleDuplicado: PosibleDuplicado | undefined;
    if (referencia !== '?' && producto !== '?') {
      const exacto = existentes.porClave.get(clave) || enEsteLotePorClave.get(clave);
      if (exacto) {
        const esDeEsteArchivo = 'fila' in exacto;
        posibleDuplicado = {
          tipo: 'exacto',
          motivo: `Ya existe un producto igual (misma referencia y mismo nombre): ${referencia} - ${producto}`,
          comparadoCon: esDeEsteArchivo
            ? { origen: 'este mismo archivo', fila: (exacto as RegistroEnLote).fila, ...resumenDe(exacto) }
            : { origen: 'base de datos', ...resumenDe(exacto) },
        };
      } else {
        const otroPorReferencia = existentes.porReferencia.get(referencia) || enEsteLotePorReferencia.get(referencia);
        if (otroPorReferencia && otroPorReferencia.producto !== producto) {
          const esDeEsteArchivo = 'fila' in otroPorReferencia;
          posibleDuplicado = {
            tipo: 'referencia',
            motivo: `Ya existe un producto con la misma referencia pero nombre distinto: "${otroPorReferencia.producto}"`,
            comparadoCon: esDeEsteArchivo
              ? { origen: 'este mismo archivo', fila: (otroPorReferencia as RegistroEnLote).fila, ...resumenDe(otroPorReferencia) }
              : { origen: 'base de datos', ...resumenDe(otroPorReferencia) },
          };
        } else {
          const otroPorNombre = existentes.porNombre.get(producto) || enEsteLotePorNombre.get(producto);
          if (otroPorNombre && otroPorNombre.referencia !== referencia) {
            const esDeEsteArchivo = 'fila' in otroPorNombre;
            posibleDuplicado = {
              tipo: 'nombre',
              motivo: `Ya existe un producto con el mismo nombre pero referencia distinta: "${otroPorNombre.referencia}"`,
              comparadoCon: esDeEsteArchivo
                ? { origen: 'este mismo archivo', fila: (otroPorNombre as RegistroEnLote).fila, ...resumenDe(otroPorNombre) }
                : { origen: 'base de datos', ...resumenDe(otroPorNombre) },
            };
          }
        }
      }
    }

    if (referencia !== '?' && producto !== '?') {
      const resumenPropio: RegistroEnLote = {
        fila: fila.fila,
        referencia,
        producto,
        proveedor: dataFinal.proveedor,
        cantidad: String(dataFinal.cantidad),
        unidades: dataFinal.unidades,
        seccion: dataFinal.seccion,
        precioVenta: dataFinal.precioVenta,
      };
      enEsteLotePorClave.set(clave, resumenPropio);
      if (!enEsteLotePorReferencia.has(referencia)) enEsteLotePorReferencia.set(referencia, resumenPropio);
      if (!enEsteLotePorNombre.has(producto)) enEsteLotePorNombre.set(producto, resumenPropio);
    }

    listas.push({ fila: fila.fila, data: dataFinal, posibleDuplicado });
  }

  return listas;
}

export async function POST(request: Request) {
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

    const body = await request.json();
    const centroCostoId: string | undefined = body.centroCostoId;
    const dryRun: boolean = !!body.dryRun;
    const filas: FilaEntrada[] = Array.isArray(body.filas) ? body.filas : [];

    if (!centroCostoId) {
      return NextResponse.json({ error: 'Debe indicar la agencia (centro de costo) destino' }, { status: 400 });
    }

    const tieneAcceso = await usuarioTieneAccesoACentro(usuario, centroCostoId);
    if (!tieneAcceso) {
      return NextResponse.json({ error: 'No tienes acceso a ese centro de costo' }, { status: 403 });
    }

    if (filas.length === 0) {
      return NextResponse.json({ error: 'El archivo no tiene filas para importar' }, { status: 400 });
    }
    // El límite de tamaño de lote solo aplica al guardado real: la
    // previsualización no escribe nada, así que puede clasificar el
    // archivo completo de una sola vez sin riesgo de timeout.
    if (!dryRun && filas.length > MAX_FILAS_POR_LOTE) {
      return NextResponse.json(
        { error: `Este endpoint acepta máximo ${MAX_FILAS_POR_LOTE} filas por lote. Divide el archivo en lotes más pequeños.` },
        { status: 400 }
      );
    }

    // Una sola consulta a la base de datos para TODO lo que necesitamos
    // saber sobre lo ya existente en esta agencia (exacto, por referencia y
    // por nombre) - las 3 estructuras de abajo son solo índices en memoria
    // sobre ese mismo resultado, no generan consultas adicionales.
    const productosExistentes: ProductoExistente[] = await prisma.producto.findMany({
      where: { centroCostoId },
      select: { referencia: true, producto: true, proveedor: true, cantidad: true, unidades: true, seccion: true, precioVenta: true },
    });

    const existentes: ExistentesEnAgencia = {
      porClave: new Map(),
      porReferencia: new Map(),
      porNombre: new Map(),
    };
    for (const p of productosExistentes) {
      existentes.porClave.set(`${p.referencia}|||${p.producto}`, p);
      if (!existentes.porReferencia.has(p.referencia)) existentes.porReferencia.set(p.referencia, p);
      if (!existentes.porNombre.has(p.producto)) existentes.porNombre.set(p.producto, p);
    }

    const listas = clasificarFilas(filas, existentes);

    if (dryRun) {
      // La pantalla de importación pagina esta lista en el propio navegador
      // (sin volver a pedirle nada al servidor por cada página), así que
      // aquí se manda el detalle completo de una sola vez.
      return NextResponse.json({
        totalFilas: filas.length,
        conPosibleDuplicado: listas.filter((l) => l.posibleDuplicado).length,
        previsualizacion: listas.map((l) => ({ fila: l.fila, ...l.data, posibleDuplicado: l.posibleDuplicado })),
      });
    }

    // Generar todos los códigos de barras EN MEMORIA (sin ir a la base de
    // datos por cada uno) y armar los registros a insertar.
    const codigosReservados = new Set<string>();
    const registros = listas.map((item) => {
      const costoLetras = encriptarCosto(item.data.costoReal);
      let codigoBarras = generarCodigoBarras('0', costoLetras);
      while (codigosReservados.has(codigoBarras)) {
        codigoBarras = generarCodigoBarras('0', costoLetras);
      }
      codigosReservados.add(codigoBarras);
      return { fila: item.fila, costoLetras, codigoBarras, data: item.data };
    });

    // Una sola consulta para ver si alguno de esos códigos ya existe en la
    // BD (choque con otro producto ya creado antes, de cualquier agencia -
    // el código de barras es único global). Si hay choque, se regenera solo
    // ese puntual; con ~8 millones de combinaciones posibles por costo, esto
    // prácticamente nunca ocurre.
    const existentesEnBD = await prisma.producto.findMany({
      where: { codigoBarras: { in: Array.from(codigosReservados) } },
      select: { codigoBarras: true },
    });
    if (existentesEnBD.length > 0) {
      const enUsoEnBD = new Set(existentesEnBD.map((p) => p.codigoBarras));
      for (const registro of registros) {
        while (enUsoEnBD.has(registro.codigoBarras)) {
          registro.codigoBarras = generarCodigoBarras('0', registro.costoLetras);
        }
      }
    }

    const datosParaInsertar = registros.map((r) => ({
      proveedor: r.data.proveedor,
      referencia: r.data.referencia,
      producto: r.data.producto,
      cantidad: r.data.cantidad,
      unidades: r.data.unidades,
      seccion: r.data.seccion,
      costo: r.costoLetras,
      costoReal: r.data.costoReal,
      precioVenta: r.data.precioVenta,
      codigo: '0',
      codigoBarras: r.codigoBarras,
      embalaje: r.data.embalaje,
      creadoPorId: usuario.id,
      centroCostoId,
      anioInventario: new Date().getFullYear(),
    }));

    let importados = 0;
    const erroresAlGuardar: FilaConError[] = [];

    try {
      // Inserción masiva: TODO el lote en un solo viaje a la base de datos.
      const resultado = await prisma.producto.createMany({ data: datosParaInsertar });
      importados = resultado.count;
    } catch (error) {
      // Si la inserción masiva falla completa (p. ej. un choque de código de
      // barras que la verificación anterior no detectó), no se descarta el
      // lote entero: se reintenta fila por fila para no perder las que sí
      // se pudieron guardar, y se reporta con precisión cuál fue la que
      // falló (esto es un error técnico de guardado, no una regla de
      // validación de datos - esas ya no existen).
      console.error('Falló la inserción masiva, reintentando fila por fila:', error);
      for (let i = 0; i < datosParaInsertar.length; i++) {
        try {
          await prisma.producto.create({ data: datosParaInsertar[i] });
          importados++;
        } catch (errorFila) {
          console.error('Error al importar fila', registros[i].fila, errorFila);
          erroresAlGuardar.push({ fila: registros[i].fila, motivo: 'Error inesperado al guardar esta fila' });
        }
      }
    }

    return NextResponse.json({
      totalFilas: filas.length,
      importados,
      erroresAlGuardar,
    });
  } catch (error) {
    console.error('Error al importar productos:', error);
    return NextResponse.json({ error: 'Error al importar productos' }, { status: 500 });
  }
}
