'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AlertTriangle, ChevronLeft, ChevronRight, Loader2, CheckCircle2, Undo2, Pencil } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { formatearCostoReal } from '@/lib/encryption';

// "Alertas" solo trackea precio de venta por debajo del costo - un cambio
// de costo (suba o baje) ya se registra en "Movimientos", que es un
// registro pasivo y no una alerta que requiera acción.
export interface AlertaHistorial {
  id: string;
  costoNuevo: number | null;
  precioVentaNuevo: number | null;
  resuelto: boolean;
  resueltoAt: string | null;
  createdAt: string;
  producto: { id: string; producto: string; referencia: string; codigo: string } | null;
  centroCosto: { id: string; nombre: string } | null;
  usuario: { nombre: string; email: string } | null;
  resueltoPor: { nombre: string } | null;
  // Calculados por el servidor según el rol (ver lib/historial-alertas.ts -
  // prepararAlertaParaRol): un asesor nunca ve el costo descifrado.
  puedeRevisar: boolean;
  puedeMarcarRevisado: boolean;
}

interface HistorialAlertasViewProps {
  // Viene de AdminView/SuperAdminView: abre el producto de la alerta en su
  // propia pantalla de edición, precargado y con el/los campos resaltados.
  // Si no se pasa (ej. ningún rol lo ofrece todavía), el botón "Revisar"
  // simplemente no se muestra.
  onRevisarProducto?: (alerta: AlertaHistorial) => void;
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

export function HistorialAlertasView({ onRevisarProducto }: HistorialAlertasViewProps) {
  const { user, isSuperAdmin, centrosCosto } = useAuth();

  const [alertas, setAlertas] = useState<AlertaHistorial[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagina, setPagina] = useState(1);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [actualizandoId, setActualizandoId] = useState<string | null>(null);

  // "Todos" por defecto: Alertas es un registro, no solo una bandeja de
  // pendientes - lo ya revisado se queda visible (en verde), no
  // desaparece de la pantalla.
  const [filtroEstado, setFiltroEstado] = useState('todos');
  const [filtroCentro, setFiltroCentro] = useState('todos');
  const [centrosFiltro, setCentrosFiltro] = useState<{ id: string; nombre: string }[]>([]);

  // Para superadmin se trae la lista completa de sucursales (no tiene
  // centros propios asignados); para admin se reutilizan los que ya vienen
  // del contexto de sesión - sin pegarle otra vez a la base de datos.
  useEffect(() => {
    if (!isSuperAdmin) {
      setCentrosFiltro(centrosCosto);
      return;
    }
    fetch('/api/centros-costo', { headers: authHeaders() })
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setCentrosFiltro(data.map((c: { id: string; nombre: string }) => ({ id: c.id, nombre: c.nombre }))))
      .catch(() => setCentrosFiltro([]));
  }, [isSuperAdmin, centrosCosto]);

  const fetchAlertas = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(pagina),
        pageSize: '15',
        estado: filtroEstado,
        ...(filtroCentro !== 'todos' ? { centroCostoId: filtroCentro } : {}),
      });
      const response = await fetch(`/api/historial-alertas?${params.toString()}`, {
        headers: authHeaders(),
      });
      if (!response.ok) return;
      const data = await response.json();
      setAlertas(data.alertas);
      setTotalPaginas(data.pagination.totalPages);
    } catch (error) {
      console.error('Error al cargar las alertas:', error);
    } finally {
      setLoading(false);
    }
  }, [pagina, filtroEstado, filtroCentro]);

  useEffect(() => {
    fetchAlertas();
  }, [fetchAlertas]);

  // Cambiar un filtro siempre vuelve a la página 1 (la selección anterior
  // puede no existir más con el nuevo filtro).
  const cambiarFiltro = (setter: (v: string) => void) => (valor: string) => {
    setter(valor);
    setPagina(1);
  };

  // Actualiza la alerta en el sitio (no vuelve a pedir la lista completa):
  // así se queda visible y pasa a verde en el momento, en vez de
  // desaparecer de la pantalla como pasaba antes al refiltrar por
  // "pendientes".
  const marcarRevisado = async (alerta: AlertaHistorial) => {
    const nuevoResuelto = !alerta.resuelto;
    setActualizandoId(alerta.id);
    try {
      const response = await fetch(`/api/historial-alertas/${alerta.id}`, {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify({ resuelto: nuevoResuelto }),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        alert(errorData.error || 'Error al actualizar la alerta');
        return;
      }
      setAlertas((prev) =>
        prev.map((a) =>
          a.id === alerta.id
            ? {
                ...a,
                resuelto: nuevoResuelto,
                resueltoAt: nuevoResuelto ? new Date().toISOString() : null,
                resueltoPor: nuevoResuelto ? { nombre: user?.nombre || 'Tú' } : null,
              }
            : a
        )
      );
    } catch (error) {
      console.error('Error al actualizar alerta:', error);
      alert('Error al actualizar la alerta');
    } finally {
      setActualizandoId(null);
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-lg sm:text-2xl font-bold text-gray-900">Alertas</h2>
      <p className="text-sm text-gray-500">
        Avisa cuando el precio de venta queda por debajo del costo, para que se corrija.
      </p>

      <div className="flex flex-wrap gap-2">
        <Select value={filtroEstado} onValueChange={cambiarFiltro(setFiltroEstado)}>
          <SelectTrigger className="w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="pendientes">Pendientes</SelectItem>
            <SelectItem value="resueltas">Revisadas</SelectItem>
            <SelectItem value="todos">Todas</SelectItem>
          </SelectContent>
        </Select>

        {centrosFiltro.length > 1 && (
          <Select value={filtroCentro} onValueChange={cambiarFiltro(setFiltroCentro)}>
            <SelectTrigger className="w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todas las sucursales</SelectItem>
              {centrosFiltro.map((c) => (
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
      ) : alertas.length === 0 ? (
        <Card>
          <CardContent className="py-8">
            <p className="text-center text-gray-500 text-sm">
              {filtroEstado === 'pendientes'
                ? 'No hay alertas pendientes para mostrar.'
                : 'No hay alertas para mostrar.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {alertas.map((alerta) => (
            <Card
              key={alerta.id}
              className={alerta.resuelto ? 'border-green-300 bg-green-50/50' : ''}
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className="bg-red-50 text-red-700 border-red-300 flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      Precio menor al costo
                    </Badge>
                    {alerta.resuelto && (
                      <Badge variant="outline" className="bg-green-100 text-green-700 border-green-400 flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" />
                        Revisado
                      </Badge>
                    )}
                    {alerta.centroCosto && (
                      <Badge variant="outline" className="text-xs text-gray-600 border-gray-300">
                        {alerta.centroCosto.nombre}
                      </Badge>
                    )}
                  </div>
                  <span className="text-xs text-gray-400">{formatearFecha(alerta.createdAt)}</span>
                </div>
                <CardTitle className="text-base pt-1">
                  {alerta.producto ? alerta.producto.producto : 'Producto eliminado'}
                  {alerta.producto && (
                    <span className="text-xs font-normal text-gray-500 ml-2">
                      Ref. {alerta.producto.referencia}
                    </span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-sm text-gray-700">
                  {alerta.costoNuevo !== null && (
                    <>
                      Costo: <strong>${formatearCostoReal(alerta.costoNuevo)}</strong>
                      {' · '}
                    </>
                  )}
                  Precio de venta:{' '}
                  <strong>${formatearCostoReal(alerta.precioVentaNuevo ?? 0)}</strong>
                </p>
                <p className="text-xs text-gray-500">
                  Generado por {alerta.usuario?.nombre || 'un usuario'}
                  {alerta.resuelto && alerta.resueltoPor && (
                    <> · Revisado por {alerta.resueltoPor.nombre}</>
                  )}
                </p>
                <div className="flex items-center gap-2 flex-wrap">
                  {alerta.puedeRevisar && alerta.producto && onRevisarProducto && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onRevisarProducto(alerta)}
                      className="flex items-center gap-2 border-amber-400 text-amber-800 hover:bg-amber-50"
                    >
                      <Pencil className="h-4 w-4" />
                      Revisar
                    </Button>
                  )}
                  {alerta.puedeMarcarRevisado && (
                    <Button
                      size="sm"
                      variant={alerta.resuelto ? 'outline' : 'default'}
                      disabled={actualizandoId === alerta.id}
                      onClick={() => marcarRevisado(alerta)}
                      className="flex items-center gap-2"
                    >
                      {actualizandoId === alerta.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : alerta.resuelto ? (
                        <Undo2 className="h-4 w-4" />
                      ) : (
                        <CheckCircle2 className="h-4 w-4" />
                      )}
                      {alerta.resuelto ? 'Marcar como pendiente' : 'Marcar como revisado'}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
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
