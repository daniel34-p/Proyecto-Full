'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DollarSign,
  ChevronLeft,
  ChevronRight,
  Loader2,
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  Undo2,
  Pencil,
  Clock,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { formatearCostoReal } from '@/lib/encryption';

export interface Movimiento {
  id: string;
  productoId: string | null;
  productoNombre: string;
  productoReferencia: string;
  proveedor: string;
  seccion: string | null;
  valorAnterior: number;
  valorNuevo: number;
  deltaValor: number;
  resuelto: boolean;
  resueltoAt: string | null;
  createdAt: string;
  centroCosto: { id: string; nombre: string } | null;
  usuario: { nombre: string } | null;
  resueltoPor: { nombre: string } | null;
}

interface MovimientosInventarioViewProps {
  // Viene de AdminView/SuperAdminView: abre el producto del movimiento en
  // su propia pantalla de edición, con el campo "costo" resaltado. Si no
  // se pasa, el botón "Revisar" simplemente no se muestra.
  onRevisarProducto?: (movimiento: Movimiento) => void;
}

function authHeaders() {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    Authorization: token ? `Bearer ${token}` : '',
  };
}

function formatearFecha(iso: string) {
  return new Date(iso).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' });
}

function formatearMoneda(valor: number) {
  const signo = valor < 0 ? '-' : '';
  return `${signo}$${formatearCostoReal(Math.abs(valor))}`;
}

export function MovimientosInventarioView({ onRevisarProducto }: MovimientosInventarioViewProps) {
  const { user, isSuperAdmin, centrosCosto, centroCostoActivo } = useAuth();

  const [centros, setCentros] = useState<{ id: string; nombre: string }[]>([]);
  const [centroSeleccionado, setCentroSeleccionado] = useState<string>('todos');

  const [movimientos, setMovimientos] = useState<Movimiento[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagina, setPagina] = useState(1);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [actualizandoId, setActualizandoId] = useState<string | null>(null);

  // "Todos" por defecto: Movimientos es un registro, no solo una bandeja
  // de pendientes - lo ya revisado se queda visible (en verde), no
  // desaparece de la pantalla. Igual criterio que Alertas.
  const [filtroEstado, setFiltroEstado] = useState('todos');

  // Igual patrón que Alertas: para superadmin se trae la lista completa
  // de sucursales; para admin se reutilizan las que ya vienen del
  // contexto de sesión - sin pegarle otra vez a la base de datos.
  useEffect(() => {
    if (!isSuperAdmin) {
      setCentros(centrosCosto);
      return;
    }
    fetch('/api/centros-costo', { headers: authHeaders() })
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setCentros(data.map((c: { id: string; nombre: string }) => ({ id: c.id, nombre: c.nombre }))))
      .catch(() => setCentros([]));
  }, [isSuperAdmin, centrosCosto]);

  // Preselecciona el centro activo del menú hamburguesa cuando hay uno,
  // en vez de arrancar siempre en "todas las sucursales".
  useEffect(() => {
    if (centroCostoActivo) setCentroSeleccionado(centroCostoActivo.id);
  }, [centroCostoActivo]);

  const fetchMovimientos = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(pagina),
        pageSize: '15',
        estado: filtroEstado,
        ...(centroSeleccionado !== 'todos' ? { centroCostoId: centroSeleccionado } : {}),
      });
      const response = await fetch(`/api/movimientos-inventario?${params.toString()}`, {
        headers: authHeaders(),
      });
      if (!response.ok) return;
      const data = await response.json();
      setMovimientos(data.movimientos);
      setTotalPaginas(data.pagination.totalPages);
    } catch (error) {
      console.error('Error al cargar los movimientos de inventario:', error);
    } finally {
      setLoading(false);
    }
  }, [centroSeleccionado, pagina, filtroEstado]);

  useEffect(() => {
    fetchMovimientos();
  }, [fetchMovimientos]);

  const cambiarCentro = (id: string) => {
    setCentroSeleccionado(id);
    setPagina(1);
  };

  const cambiarFiltroEstado = (valor: string) => {
    setFiltroEstado(valor);
    setPagina(1);
  };

  // Actualiza el movimiento en el sitio (no vuelve a pedir la lista
  // completa): se queda visible y pasa a verde en el momento, igual
  // criterio que Alertas.
  const marcarRevisado = async (mov: Movimiento) => {
    const nuevoResuelto = !mov.resuelto;
    setActualizandoId(mov.id);
    try {
      const response = await fetch(`/api/movimientos-inventario/${mov.id}`, {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify({ resuelto: nuevoResuelto }),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        alert(errorData.error || 'Error al actualizar el movimiento');
        return;
      }
      setMovimientos((prev) =>
        prev.map((m) =>
          m.id === mov.id
            ? {
                ...m,
                resuelto: nuevoResuelto,
                resueltoAt: nuevoResuelto ? new Date().toISOString() : null,
                resueltoPor: nuevoResuelto ? { nombre: user?.nombre || 'Tú' } : null,
              }
            : m
        )
      );
    } catch (error) {
      console.error('Error al actualizar movimiento:', error);
      alert('Error al actualizar el movimiento');
    } finally {
      setActualizandoId(null);
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-lg sm:text-2xl font-bold text-gray-900">Movimientos de Inventario</h2>
      <p className="text-sm text-gray-500">
        Cada vez que el costo de un producto sube o baja, para justificar por qué cambia el valor en plata
        del inventario.
      </p>

      <div className="flex flex-wrap gap-2">
        <Select value={filtroEstado} onValueChange={cambiarFiltroEstado}>
          <SelectTrigger className="w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="pendientes">Pendientes</SelectItem>
            <SelectItem value="resueltas">Revisados</SelectItem>
            <SelectItem value="todos">Todos</SelectItem>
          </SelectContent>
        </Select>

        {centros.length > 1 && (
          <Select value={centroSeleccionado} onValueChange={cambiarCentro}>
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder="Selecciona una sucursal" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todas las sucursales</SelectItem>
              {centros.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.nombre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        </div>
      ) : movimientos.length === 0 ? (
        <Card>
          <CardContent className="py-8">
            <p className="text-center text-gray-500 text-sm">
              {filtroEstado === 'pendientes'
                ? 'No hay movimientos pendientes de revisar.'
                : 'No hay movimientos de costo registrados todavía.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {movimientos.map((mov) => {
            // La dirección se decide comparando el costo en sí (nunca son
            // iguales: solo se registra un movimiento cuando de verdad
            // cambió) - no el signo de deltaValor, que puede ser 0 aunque
            // el costo sí haya subido o bajado (producto sin cantidad).
            const costoSubio = mov.valorNuevo > mov.valorAnterior;
            const sinImpacto = mov.deltaValor === 0;
            // Reemplazado automáticamente por un cambio más reciente del
            // MISMO producto (ver lib/movimientos-inventario.ts) - se
            // distingue de un "revisado" real porque resueltoPorId queda
            // en null: nadie lo marcó a mano, solo quedó viejo.
            const reemplazado = mov.resuelto && !mov.resueltoPor;
            const revisadoManual = mov.resuelto && !!mov.resueltoPor;
            return (
              <Card
                key={mov.id}
                className={
                  revisadoManual
                    ? 'border-green-300 bg-green-50/50'
                    : reemplazado
                    ? 'border-gray-200 bg-gray-50/50'
                    : sinImpacto
                    ? 'border-gray-200'
                    : costoSubio
                    ? 'border-green-200'
                    : 'border-red-200'
                }
              >
                <CardContent className="py-3 space-y-1.5">
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge
                        variant="outline"
                        className={`flex items-center gap-1 ${
                          costoSubio
                            ? 'bg-green-50 text-green-700 border-green-300'
                            : 'bg-red-50 text-red-700 border-red-300'
                        }`}
                      >
                        <DollarSign className="h-3 w-3" />
                        {costoSubio ? 'Costo subió' : 'Costo bajó'}
                      </Badge>
                      {revisadoManual && (
                        <Badge variant="outline" className="bg-green-100 text-green-700 border-green-400 flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3" />
                          Revisado
                        </Badge>
                      )}
                      {reemplazado && (
                        <Badge variant="outline" className="bg-gray-100 text-gray-600 border-gray-300 flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Reemplazado
                        </Badge>
                      )}
                      <span className="font-medium text-gray-900">{mov.productoNombre}</span>
                      <span className="text-xs text-gray-500">Ref. {mov.productoReferencia}</span>
                    </div>
                    <span className="text-xs text-gray-400">{formatearFecha(mov.createdAt)}</span>
                  </div>
                  <p className="text-sm text-gray-700">
                    Costo: <strong>${formatearCostoReal(mov.valorAnterior)}</strong>
                    {' → '}
                    <strong>${formatearCostoReal(mov.valorNuevo)}</strong>
                  </p>

                  {sinImpacto ? (
                    <p className="text-sm text-gray-500 flex items-start gap-1.5">
                      <DollarSign className="h-4 w-4 flex-shrink-0 mt-0.5" />
                      <span>
                        El producto <strong>{mov.productoNombre}</strong> {costoSubio ? 'subió' : 'bajó'} de
                        costo y no afectó al Gran Total, proveedor ni departamento (no tiene cantidad en
                        inventario).
                      </span>
                    </p>
                  ) : (
                    <p
                      className={`text-sm flex items-start gap-1.5 ${
                        costoSubio ? 'text-green-700' : 'text-red-700'
                      }`}
                    >
                      {costoSubio ? (
                        <TrendingUp className="h-4 w-4 flex-shrink-0 mt-0.5" />
                      ) : (
                        <TrendingDown className="h-4 w-4 flex-shrink-0 mt-0.5" />
                      )}
                      <span>
                        Hubo una {costoSubio ? 'subida' : 'bajada'} de{' '}
                        <strong>{formatearMoneda(Math.abs(mov.deltaValor))}</strong>, afectando el{' '}
                        <strong>Gran Total</strong>
                        {mov.seccion && (
                          <>
                            , el departamento <strong className="capitalize">{mov.seccion}</strong>
                          </>
                        )}{' '}
                        y el proveedor <strong className="capitalize">{mov.proveedor}</strong>.
                      </span>
                    </p>
                  )}

                  <p className="text-xs text-gray-500">
                    Registrado por {mov.usuario?.nombre || 'un usuario'}
                    {mov.centroCosto && <> · {mov.centroCosto.nombre}</>}
                    {revisadoManual && mov.resueltoPor && <> · Revisado por {mov.resueltoPor.nombre}</>}
                  </p>

                  {reemplazado ? (
                    <p className="text-xs text-gray-500 flex items-start gap-1.5 pt-1">
                      <Clock className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
                      <span>Este producto tiene un cambio más reciente - revísalo desde ese registro.</span>
                    </p>
                  ) : (
                    <div className="flex items-center gap-2 flex-wrap pt-1">
                      {!mov.resuelto && mov.productoId && onRevisarProducto && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onRevisarProducto(mov)}
                          className="flex items-center gap-2 border-amber-400 text-amber-800 hover:bg-amber-50"
                        >
                          <Pencil className="h-4 w-4" />
                          Revisar
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant={mov.resuelto ? 'outline' : 'default'}
                        disabled={actualizandoId === mov.id}
                        onClick={() => marcarRevisado(mov)}
                        className="flex items-center gap-2"
                      >
                        {actualizandoId === mov.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : mov.resuelto ? (
                          <Undo2 className="h-4 w-4" />
                        ) : (
                          <CheckCircle2 className="h-4 w-4" />
                        )}
                        {mov.resuelto ? 'Marcar como pendiente' : 'Marcar como revisado'}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {totalPaginas > 1 && (
        <div className="flex items-center justify-center gap-3 pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPagina((p) => Math.max(1, p - 1))}
            disabled={pagina === 1 || loading}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-gray-600">
            Página {pagina} de {totalPaginas}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
            disabled={pagina === totalPaginas || loading}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
