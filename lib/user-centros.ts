import { prisma } from './prisma';

export interface CentroCostoResumen {
  id: string;
  nombre: string;
  activo: boolean;
}

interface UsuarioConCentros {
  centroCosto: CentroCostoResumen | null;
  centrosCostoAdicionales: { centroCosto: CentroCostoResumen }[];
}

/**
 * Deriva todos los centros de costo asignados a un usuario (su centro
 * "principal" más los adicionales en UsuarioCentroCosto, sin duplicados) a
 * partir de un usuario que YA se consultó con esas relaciones incluidas
 * (`centroCosto` y `centrosCostoAdicionales.centroCosto`).
 *
 * No toca la base de datos - a diferencia de obtenerCentrosDeUsuario de
 * abajo, que sí consulta. Úsala siempre que el caller ya tenga el usuario
 * cargado (la mayoría de las rutas lo tienen, para validar el token), así
 * no se repite la misma consulta dos veces en una sola request.
 */
export function derivarCentrosDeUsuario(usuario: UsuarioConCentros): CentroCostoResumen[] {
  const mapa = new Map<string, CentroCostoResumen>();
  if (usuario.centroCosto) {
    mapa.set(usuario.centroCosto.id, usuario.centroCosto);
  }
  for (const rel of usuario.centrosCostoAdicionales) {
    mapa.set(rel.centroCosto.id, rel.centroCosto);
  }

  return Array.from(mapa.values());
}

/**
 * Igual que derivarCentrosDeUsuario, pero a partir de un id - consulta el
 * usuario a la base de datos. Úsala solo cuando no tengas ya un usuario
 * cargado con sus relaciones a mano.
 *
 * Para un usuario de un solo centro (el caso de siempre), esto devuelve
 * un array de un solo elemento - el comportamiento actual no cambia.
 */
export async function obtenerCentrosDeUsuario(usuarioId: string): Promise<CentroCostoResumen[]> {
  const usuario = await prisma.usuario.findUnique({
    where: { id: usuarioId },
    include: {
      centroCosto: true,
      centrosCostoAdicionales: { include: { centroCosto: true } },
    },
  });

  if (!usuario) return [];

  return derivarCentrosDeUsuario(usuario);
}

/**
 * Valida si un centroCostoId dado está entre los centros asignados al
 * usuario (principal o adicional). SuperAdmin siempre tiene acceso.
 */
export async function usuarioTieneAccesoACentro(
  usuario: { id: string; rol: string; centroCostoId: string | null },
  centroCostoId: string
): Promise<boolean> {
  if (usuario.rol === 'superadmin') return true;
  if (usuario.centroCostoId === centroCostoId) return true;

  const relacion = await prisma.usuarioCentroCosto.findUnique({
    where: {
      usuarioId_centroCostoId: {
        usuarioId: usuario.id,
        centroCostoId,
      },
    },
  });
  return !!relacion;
}