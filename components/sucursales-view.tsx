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

export function SucursalesView() {
  const [centros, setCentros] = useState<CentroCosto[]>([]);
  const [loading, setLoading] = useState(true);
  const [sucursalSeleccionada, setSucursalSeleccionada] = useState<{ id: string; nombre: string } | null>(null);
  const [configModalOpen, setConfigModalOpen] = useState(false);

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

  // Vista de detalle: inventario de la sucursal seleccionada
  if (sucursalSeleccionada) {
    return (
      <SucursalInventario
        centroCosto={sucursalSeleccionada}
        onVolver={() => setSucursalSeleccionada(null)}
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {centrosVisibles.map((centro) => (
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

      {/* Modal de gestión: crear, activar/desactivar y eliminar sucursales */}
      <CentrosCostoConfig
        isOpen={configModalOpen}
        onClose={() => setConfigModalOpen(false)}
        onCentroCreado={fetchCentros}
      />
    </div>
  );
}