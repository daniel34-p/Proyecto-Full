import { prisma } from './prisma';

export interface CentroCostoResumen {
  id: string;
  nombre: string;
  activo: boolean;
}

/**
 * Devuelve todos los centros de costo asignados a un usuario: su centro
 * "principal" (usuario.centroCostoId, el de siempre) más los adicionales
 * asignados en UsuarioCentroCosto. Sin duplicados.
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