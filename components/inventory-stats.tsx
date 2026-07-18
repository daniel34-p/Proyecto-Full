'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Eye, EyeOff, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface GrupoStat {
  nombre: string;
  totalProductos: number;
  valorTotal: number;
}

interface Estadisticas {
  totalProductos: number;
  proveedores: GrupoStat[];
  departamentos: GrupoStat[];
  granTotal: number;
}

interface InventoryStatsProps {
  estadisticas: Estadisticas | null;
  loading?: boolean;
}

// Paleta genérica para las tarjetas de departamento (a diferencia de
// proveedor, que tiene colores fijos para "bodega"/"alea", los
// departamentos son una lista abierta que el usuario gestiona).
const PALETA_DEPARTAMENTOS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ec4899', '#06b6d4'];

export function InventoryStats({ estadisticas, loading }: InventoryStatsProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [vista, setVista] = useState<'proveedor' | 'departamento'>('proveedor');
  const [mostrarMontos, setMostrarMontos] = useState(() => {
    // Cargar preferencia del localStorage
    if (typeof window === 'undefined') return true;
    const saved = localStorage.getItem('mostrarMontos');
    return saved !== null ? JSON.parse(saved) : true;
  });

  // Guardar preferencia en localStorage
  useEffect(() => {
    localStorage.setItem('mostrarMontos', JSON.stringify(mostrarMontos));
  }, [mostrarMontos]);

  const totalProductos = estadisticas?.totalProductos || 0;
  const granTotal = estadisticas?.granTotal || 0;

  const grupoArray =
    vista === 'proveedor'
      ? estadisticas?.proveedores || []
      : estadisticas?.departamentos || [];

  const etiquetaGrupo = vista === 'proveedor' ? 'Proveedor' : 'Departamento';

  // Verificar si se puede hacer scroll
  const checkScroll = () => {
    if (scrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
    }
  };

  useEffect(() => {
    checkScroll();
    window.addEventListener('resize', checkScroll);
    return () => window.removeEventListener('resize', checkScroll);
  }, [grupoArray]);

  // Al cambiar de vista, volver el scroll al inicio
  useEffect(() => {
    scrollContainerRef.current?.scrollTo({ left: 0 });
  }, [vista]);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const scrollAmount = 320;
      const newScrollLeft = 
        direction === 'left'
          ? scrollContainerRef.current.scrollLeft - scrollAmount
          : scrollContainerRef.current.scrollLeft + scrollAmount;
      
      scrollContainerRef.current.scrollTo({
        left: newScrollLeft,
        behavior: 'smooth',
      });
      
      setTimeout(checkScroll, 300);
    }
  };

  const formatearMonto = (valor: number) => {
    if (!mostrarMontos) {
      return '•••••••';
    }
    return `$${valor.toLocaleString('es-CO', { 
      minimumFractionDigits: 2,
      maximumFractionDigits: 2 
    })}`;
  };

  const colorParaGrupo = (nombre: string, index: number) => {
    if (vista === 'proveedor') {
      const key = nombre.toLowerCase();
      if (key === 'bodega') return '#3b82f6';
      if (key === 'alea') return '#8b5cf6';
      return '#10b981';
    }
    return PALETA_DEPARTAMENTOS[index % PALETA_DEPARTAMENTOS.length];
  };

  return (
    <div className="relative">
      {/* Selector Proveedor / Departamento + botón de ocultar montos */}
      <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
        <div className="inline-flex rounded-md border border-gray-200 bg-gray-100 p-0.5">
          <button
            type="button"
            onClick={() => setVista('proveedor')}
            className={`px-3 py-1.5 text-xs sm:text-sm font-medium rounded-[5px] transition-colors ${
              vista === 'proveedor'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Proveedor
          </button>
          <button
            type="button"
            onClick={() => setVista('departamento')}
            className={`px-3 py-1.5 text-xs sm:text-sm font-medium rounded-[5px] transition-colors ${
              vista === 'departamento'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Departamento
          </button>
        </div>

        <div className="flex items-center gap-2">
          {loading && <Loader2 className="h-4 w-4 animate-spin text-gray-400" />}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setMostrarMontos(!mostrarMontos)}
            className="flex items-center gap-2"
          >
            {mostrarMontos ? (
              <>
                <EyeOff className="h-4 w-4" />
                <span className="hidden sm:inline">Ocultar montos</span>
                <span className="sm:hidden">Ocultar</span>
              </>
            ) : (
              <>
                <Eye className="h-4 w-4" />
                <span className="hidden sm:inline">Mostrar montos</span>
                <span className="sm:hidden">Mostrar</span>
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Botón scroll izquierda */}
      {canScrollLeft && (
        <Button
          variant="outline"
          size="icon"
          className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-white shadow-lg"
          onClick={() => scroll('left')}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
      )}

      {/* Contenedor con scroll */}
      <div
        ref={scrollContainerRef}
        onScroll={checkScroll}
        className="flex gap-4 overflow-x-auto scrollbar-hide scroll-smooth pb-2"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {/* Card de Total Productos */}
        <Card className="min-w-[300px] flex-shrink-0">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Total Productos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalProductos}</div>
            <p className="text-xs text-gray-500 mt-1">
              En inventario
            </p>
          </CardContent>
        </Card>

        {/* Cards dinámicas por proveedor o departamento, según la vista */}
        {grupoArray.map((grupo, index) => (
          <Card 
            key={grupo.nombre} 
            className="min-w-[300px] flex-shrink-0 border-l-4"
            style={{ borderLeftColor: colorParaGrupo(grupo.nombre, index) }}
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 capitalize">
                {etiquetaGrupo}: {grupo.nombre}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {formatearMonto(grupo.valorTotal)}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {grupo.totalProductos} producto{grupo.totalProductos !== 1 ? 's' : ''}
              </p>
            </CardContent>
          </Card>
        ))}

        {/* Card de Gran Total (solo tiene sentido para la vista de proveedor,
            ya que la suma de todos los proveedores es el total general;
            sumar todos los departamentos da el mismo número, así que se
            muestra en ambas vistas) */}
        {grupoArray.length > 0 && (
          <Card className="min-w-[300px] flex-shrink-0 border-l-4 border-l-green-500 bg-gradient-to-br from-green-50 to-emerald-50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-green-700">
                Gran Total
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-700">
                {formatearMonto(granTotal)}
              </div>
              <p className="text-xs text-green-600 mt-1">
                Suma de todo el inventario
              </p>
            </CardContent>
          </Card>
        )}

        {/* Mensaje si no hay datos para la vista seleccionada */}
        {grupoArray.length === 0 && !loading && (
          <Card className="min-w-[300px] flex-shrink-0">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                {etiquetaGrupo}s
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-500">
                No hay {vista === 'proveedor' ? 'proveedores' : 'departamentos'} registrados aún
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Botón scroll derecha */}
      {canScrollRight && (
        <Button
          variant="outline"
          size="icon"
          className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-white shadow-lg"
          onClick={() => scroll('right')}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      )}

      {/* CSS para ocultar scrollbar */}
      <style jsx>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
}