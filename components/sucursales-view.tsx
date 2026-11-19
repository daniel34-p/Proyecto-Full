'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, Building2, Package, Users, ChevronRight, Settings } from 'lucide-react';
import { SucursalInventario } from '@/components/sucursal-inventario';
import { CentrosCostoConfig } from '@/components/centros-costo-config';

interface CentroCosto {
  id: string;
  nombre: string;
  activo: boolean;
  _count?: {
    usuarios: number;
    productos: number;
  };
}

interface GrupoNumero {
  numero: number;
  color: { dot: string; icon: string };
  sucursales: CentroCosto[];
}

// Colores que se asignan por grupo (ciclan si hay más grupos que colores).
const PALETA_COLORES = [
  { dot: 'bg-purple-500', icon: 'text-purple-600' },
  { dot: 'bg-blue-500', icon: 'text-blue-600' },
  { dot: 'bg-green-500', icon: 'text-green-600' },
  { dot: 'bg-orange-500', icon: 'text-orange-600' },
  { dot: 'bg-pink-500', icon: 'text-pink-600' },
  { dot: 'bg-teal-500', icon: 'text-teal-600' },
  { dot: 'bg-amber-500', icon: 'text-amber-600' },
  { dot: 'bg-indigo-500', icon: 'text-indigo-600' },
  { dot: 'bg-rose-500', icon: 'text-rose-600' },
  { dot: 'bg-cyan-500', icon: 'text-cyan-600' },
];

// Separa "Almacen-A (2)" en { base: "Almacen-A", numero: 2 }. Si no hay "(N)" al final,
// la sucursal no tiene número y no entra en ningún grupo numerado.
function parseNombreSucursal(nombre: string): { base: string; numero: number | null } {
  const match = nombre.trim().match(/^(.*?)\s*\((\d+)\)\s*$/);
  if (match) {
    return { base: match[1].trim(), numero: parseInt(match[2], 10) };
  }
  return { base: nombre.trim(), numero: null };
}

// Agrupa las sucursales que comparten el mismo número entre paréntesis
// (ej. "Almacen-A (2)", "Almacen-B (2)" y "Bodega-Metro (2)" quedan en el mismo grupo "2"),
// sin importar que sus nombres base sean distintos.
function agruparPorNumero(centros: CentroCosto[]): {
  gruposNumerados: GrupoNumero[];
  sinNumero: CentroCosto[];
} {
  const porNumero = new Map<number, CentroCosto[]>();
  const sinNumero: CentroCosto[] = [];

  for (const centro of centros) {
    const { numero } = parseNombreSucursal(centro.nombre);
    if (numero === null) {
      sinNumero.push(centro);
      continue;
    }
    if (!porNumero.has(numero)) {
      porNumero.set(numero, []);
    }
    porNumero.get(numero)!.push(centro);
  }

  const gruposNumerados = Array.from(porNumero.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([numero, sucursales], index) => ({
      numero,
      color: PALETA_COLORES[index % PALETA_COLORES.length],
      sucursales: sucursales.sort((a, b) =>
        a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' })
      ),
    }));

  sinNumero.sort((a, b) => a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' }));

  return { gruposNumerados, sinNumero };
}

interface ProductoARevisar {
  centroCosto: { id: string; nombre: string };
  productoId: string;
  campos: Array<'costo' | 'precioVenta'>;
  mensaje: string;
}

interface SucursalesViewProps {
  // NUEVO: llega desde el botón "Revisar" de Alertas (ver
  // superadmin-view.tsx) - abre directamente la sucursal y el producto
  // indicados, sin que el superadmin tenga que buscarlos a mano.
  productoARevisar?: ProductoARevisar | null;
  onProductoARevisarConsumido?: () => void;
}

export function SucursalesView({ productoARevisar, onProductoARevisarConsumido }: SucursalesViewProps = {}) {
  const [centros, setCentros] = useState<CentroCosto[]>([]);
  const [loading, setLoading] = useState(true);
  const [sucursalSeleccionada, setSucursalSeleccionada] = useState<{ id: string; nombre: string } | null>(null);
  const [configModalOpen, setConfigModalOpen] = useState(false);

  // Si viene un producto a revisar, su sucursal manda - aunque el
  // superadmin ya estuviera viendo otra distinta.
  useEffect(() => {
    if (productoARevisar) {
      setSucursalSeleccionada(productoARevisar.centroCosto);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productoARevisar?.productoId]);

  const fetchCentros = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/centros-costo', {
        headers: { Authorization: token ? `Bearer ${token}` : '' },
      });
      if (!response.ok) return;
      const data = await response.json();
      setCentros(data);
    } catch (error) {
      console.error('Error al cargar sucursales:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCentros();
  }, []);

  // NUEVO: las sucursales desactivadas ya no se muestran en esta grilla -
  // el dato no se pierde (sigue en la base de datos), solo se oculta aquí.
  // Para verlas/reactivarlas/eliminarlas de verdad, se usa "Gestionar".
  const centrosVisibles = centros.filter((c) => c.activo);
  const { gruposNumerados, sinNumero } = agruparPorNumero(centrosVisibles);

  // Vista de detalle: inventario de la sucursal seleccionada
  if (sucursalSeleccionada) {
    return (
      <SucursalInventario
        centroCosto={sucursalSeleccionada}
        onVolver={() => setSucursalSeleccionada(null)}
        productoARevisar={
          productoARevisar?.centroCosto.id === sucursalSeleccionada.id ? productoARevisar : null
        }
        onProductoARevisarConsumido={onProductoARevisarConsumido}
      />
    );
  }

  // Vista de lista: todas las sucursales activas
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h2 className="text-lg sm:text-2xl font-bold text-gray-900">Sucursales</h2>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setConfigModalOpen(true)}
          className="flex items-center gap-2"
        >
          <Settings className="h-4 w-4" />
          Gestionar Sucursales
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        </div>
      ) : centrosVisibles.length === 0 ? (
        <Card>
          <CardContent className="py-8">
            <p className="text-center text-gray-500 text-sm">
              {centros.length === 0
                ? 'No hay centros de costo (sucursales) registrados todavía.'
                : 'No hay sucursales activas. Usa "Gestionar Sucursales" para reactivar alguna.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-5">
          {gruposNumerados.map((grupo) => (
            <div key={`grupo-${grupo.numero}`} className="rounded-xl border border-gray-200 bg-gray-50/60 p-4">
              <div className="flex items-center gap-2 mb-3">
                <span className={`h-3 w-3 rounded-full flex-shrink-0 ${grupo.color.dot}`} />
                <h3 className="text-sm font-semibold text-gray-700">Centro de Costo {grupo.numero}</h3>
                <Badge variant="outline" className="text-xs text-gray-500 border-gray-300 bg-white">
                  {grupo.sucursales.length}{' '}
                  {grupo.sucursales.length === 1 ? 'sucursal' : 'sucursales'}
                </Badge>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {grupo.sucursales.map((centro) => (
                  <Card
                    key={centro.id}
                    className="cursor-pointer hover:shadow-md hover:border-purple-300 transition-all bg-white"
                    onClick={() => setSucursalSeleccionada({ id: centro.id, nombre: centro.nombre })}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <CardTitle className="flex items-center gap-2 text-base">
                          <Building2 className={`h-5 w-5 flex-shrink-0 ${grupo.color.icon}`} />
                          {parseNombreSucursal(centro.nombre).base}
                        </CardTitle>
                        <ChevronRight className="h-4 w-4 text-gray-400 flex-shrink-0 mt-1" />
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">
                        Activo
                      </Badge>
                      <div className="flex items-center gap-4 text-sm text-gray-600 pt-1">
                        <div className="flex items-center gap-1">
                          <Package className="h-3.5 w-3.5" />
                          {centro._count?.productos ?? 0} productos
                        </div>
                        <div className="flex items-center gap-1">
                          <Users className="h-3.5 w-3.5" />
                          {centro._count?.usuarios ?? 0} usuarios
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}

          {sinNumero.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {sinNumero.map((centro) => (
                <Card
                  key={centro.id}
                  className="cursor-pointer hover:shadow-md hover:border-purple-300 transition-all"
                  onClick={() => setSucursalSeleccionada({ id: centro.id, nombre: centro.nombre })}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <CardTitle className="flex items-center gap-2 text-base">
                        <Building2 className="h-5 w-5 text-purple-600 flex-shrink-0" />
                        {centro.nombre}
                      </CardTitle>
                      <ChevronRight className="h-4 w-4 text-gray-400 flex-shrink-0 mt-1" />
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">
                      Activo
                    </Badge>
                    <div className="flex items-center gap-4 text-sm text-gray-600 pt-1">
                      <div className="flex items-center gap-1">
                        <Package className="h-3.5 w-3.5" />
                        {centro._count?.productos ?? 0} productos
                      </div>
                      <div className="flex items-center gap-1">
                        <Users className="h-3.5 w-3.5" />
                        {centro._count?.usuarios ?? 0} usuarios
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modal de gestión: crear, activar/desactivar y eliminar sucursales */}
      <CentrosCostoConfig
        isOpen={configModalOpen}
        onClose={() => setConfigModalOpen(false)}
        onCentroCreado={fetchCentros}
      />
    </div>
  );
}