'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Producto {
  id: string;
  proveedor: string;
  referencia: string;
  producto: string;
  cantidad: number;
  unidades: string;
  costo: string;
  costoReal: number;
  precioVenta: string;
  codigo: string;
  codigoBarras: string;
  createdAt: string;
  creadoPor?: {
    nombre: string;
    email: string;
    rol: string;
  };
  editadoPor?: {
    nombre: string;
    email: string;
    rol: string;
  };
}

interface InventoryStatsProps {
  productos: Producto[];
}

export function InventoryStats({ productos }: InventoryStatsProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [mostrarMontos, setMostrarMontos] = useState(() => {
    // Cargar preferencia del localStorage
    const saved = localStorage.getItem('mostrarMontos');
    return saved !== null ? JSON.parse(saved) : true;
  });

  // Guardar preferencia en localStorage
  useEffect(() => {
    localStorage.setItem('mostrarMontos', JSON.stringify(mostrarMontos));
  }, [mostrarMontos]);

  // Calcular estadísticas por proveedor (con validación inline)
  const proveedoresStats = Array.isArray(productos)
    ? productos.reduce((acc, producto) => {
        const proveedor = producto.proveedor;
        
        if (!acc[proveedor]) {
          acc[proveedor] = {
            nombre: proveedor,
            totalProductos: 0,
            valorTotal: 0, // Costo Real × Cantidad
          };
        }
        
        acc[proveedor].totalProductos += 1;
        const costoTotal = producto.costoReal * producto.cantidad;
        acc[proveedor].valorTotal += costoTotal;
        
        return acc;
      }, {} as Record<string, { nombre: string; totalProductos: number; valorTotal: number }>)
    : {};

  const proveedoresArray = Object.values(proveedoresStats);
  const totalProductos = Array.isArray(productos) ? productos.length : 0;
  
  // Calcular Gran Total (suma de todos los proveedores)
  const granTotal = proveedoresArray.reduce((sum, proveedor) => {
    return sum + proveedor.valorTotal;
  }, 0);

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
  }, [proveedoresArray]);

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

  return (
    <div className="relative">
      {/* Botón de ocultar/mostrar montos */}
      <div className="flex justify-end mb-4">
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

        {/* Cards dinámicas por proveedor */}
        {proveedoresArray.map((proveedor) => (
          <Card 
            key={proveedor.nombre} 
            className="min-w-[300px] flex-shrink-0 border-l-4"
            style={{
              borderLeftColor: 
                proveedor.nombre.toLowerCase() === 'bodega' 
                  ? '#3b82f6' 
                  : proveedor.nombre.toLowerCase() === 'alea'
                  ? '#8b5cf6'
                  : '#10b981'
            }}
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 capitalize">
                Proveedor: {proveedor.nombre}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {formatearMonto(proveedor.valorTotal)}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {proveedor.totalProductos} producto{proveedor.totalProductos !== 1 ? 's' : ''}
              </p>
            </CardContent>
          </Card>
        ))}

        {/* Card de Gran Total */}
        {proveedoresArray.length > 0 && (
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
                Suma de todos los proveedores
              </p>
            </CardContent>
          </Card>
        )}

        {/* Mensaje si no hay proveedores */}
        {proveedoresArray.length === 0 && (
          <Card className="min-w-[300px] flex-shrink-0">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Proveedores
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-500">
                No hay proveedores registrados aún
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