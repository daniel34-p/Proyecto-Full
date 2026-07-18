'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Building2, Package, Users, ChevronRight } from 'lucide-react';
import { SucursalInventario } from '@/components/sucursal-inventario';

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

  // Vista de detalle: inventario de la sucursal seleccionada
  if (sucursalSeleccionada) {
    return (
      <SucursalInventario
        centroCosto={sucursalSeleccionada}
        onVolver={() => setSucursalSeleccionada(null)}
      />
    );
  }

  // Vista de lista: todas las sucursales
  return (
    <div className="space-y-4">
      <h2 className="text-lg sm:text-2xl font-bold text-gray-900">Sucursales</h2>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        </div>
      ) : centros.length === 0 ? (
        <Card>
          <CardContent className="py-8">
            <p className="text-center text-gray-500 text-sm">
              No hay centros de costo (sucursales) registrados todavía.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {centros.map((centro) => (
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
                {centro.activo ? (
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">
                    Activo
                  </Badge>
                ) : (
                  <Badge variant="outline" className="bg-gray-100 text-gray-600 border-gray-300">
                    Inactivo
                  </Badge>
                )}
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
  );
}