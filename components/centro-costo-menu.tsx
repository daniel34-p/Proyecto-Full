'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Menu, X, Building2, Check } from 'lucide-react';
import { getCentroCostoColor } from '@/lib/centro-costo-colors';

interface CentroCosto {
  id: string;
  nombre: string;
}

interface CentroCostoMenuProps {
  centros: CentroCosto[];
  centroActivo: CentroCosto | null;
  onSeleccionar: (centro: CentroCosto) => void;
}

// Menú hamburguesa lateral para navegar entre los centros de costo (módulos)
// asignados a un Admin/Asesor multi-centro. Si el usuario solo tiene un
// centro, este componente no renderiza nada - no cambia la experiencia
// actual de usuarios de un solo centro.
export function CentroCostoMenu({ centros, centroActivo, onSeleccionar }: CentroCostoMenuProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  if (centros.length <= 1) return null;

  const seleccionar = (centro: CentroCosto) => {
    onSeleccionar(centro);
    setMenuOpen(false);
  };

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setMenuOpen(true)}
        className="flex-shrink-0"
        aria-label="Cambiar centro de costo"
        title="Cambiar centro de costo"
      >
        <Menu className="h-5 w-5" />
      </Button>

      {menuOpen && (
        <div className="fixed inset-0 bg-black/40 z-40" onClick={() => setMenuOpen(false)} />
      )}
      <aside
        className={`fixed top-0 left-0 h-full w-72 bg-white shadow-xl z-50 transform transition-transform duration-200 ease-in-out ${
          menuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between px-4 py-4 border-b">
          <span className="font-semibold text-gray-900">Mis Centros de Costo</span>
          <Button variant="ghost" size="icon" onClick={() => setMenuOpen(false)} aria-label="Cerrar menú">
            <X className="h-5 w-5" />
          </Button>
        </div>
        <nav className="p-2">
          {centros.map((centro) => {
            const activo = centro.id === centroActivo?.id;
            const colores = getCentroCostoColor(centro.nombre);
            return (
              <button
                key={centro.id}
                onClick={() => seleccionar(centro)}
                className={`w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors mb-1 ${
                  activo ? `${colores.bg} ${colores.text}` : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <span className="flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  {centro.nombre}
                </span>
                {activo && <Check className="h-4 w-4" />}
              </button>
            );
          })}
        </nav>
      </aside>
    </>
  );
}