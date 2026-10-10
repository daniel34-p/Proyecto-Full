'use client';

import { ReactNode, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Menu, X, Building2, Check } from 'lucide-react';
import { getCentroCostoColor } from '@/lib/centro-costo-colors';

interface CentroCosto {
  id: string;
  nombre: string;
}

export interface ModuloMenu {
  id: string;
  label: string;
  icon?: ReactNode;
}

interface CentroCostoMenuProps {
  centros: CentroCosto[];
  centroActivo: CentroCosto | null;
  onSeleccionar: (centro: CentroCosto) => void;
  // Opcional: una segunda sección de navegación por "módulos" (por ejemplo,
  // Registrar Producto / Ver Productos para el rol asesor). Si no se pasa,
  // el menú se comporta exactamente igual que antes.
  modulos?: ModuloMenu[];
  moduloActivo?: string;
  onSeleccionarModulo?: (id: string) => void;
}

// Menú hamburguesa lateral. Siempre pudo navegar entre los centros de costo
// (módulos) asignados a un Admin/Asesor multi-centro - si el usuario solo
// tiene un centro, esa sección no aparece. Ahora también puede mostrar,
// opcionalmente, una sección de navegación por módulos de la aplicación
// (ver `modulos`). Si no hay nada que mostrar en ninguna de las dos
// secciones, no renderiza nada - no cambia la experiencia de quien ya lo
// usaba solo para centros de costo.
export function CentroCostoMenu({
  centros,
  centroActivo,
  onSeleccionar,
  modulos,
  moduloActivo,
  onSeleccionarModulo,
}: CentroCostoMenuProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  const hayCentros = centros.length > 1;
  const hayModulos = !!modulos && modulos.length > 1;
  if (!hayCentros && !hayModulos) return null;

  const seleccionarCentro = (centro: CentroCosto) => {
    onSeleccionar(centro);
    setMenuOpen(false);
  };

  const seleccionarModulo = (id: string) => {
    onSeleccionarModulo?.(id);
    setMenuOpen(false);
  };

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setMenuOpen(true)}
        className="flex-shrink-0"
        aria-label="Abrir menú"
        title="Abrir menú"
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
          <span className="font-semibold text-gray-900">Menú</span>
          <Button variant="ghost" size="icon" onClick={() => setMenuOpen(false)} aria-label="Cerrar menú">
            <X className="h-5 w-5" />
          </Button>
        </div>

        {hayModulos && (
          <nav className="p-2 border-b">
            <p className="text-xs font-medium text-gray-500 px-3 pt-1 pb-2">Módulos</p>
            {modulos!.map((modulo) => {
              const activo = modulo.id === moduloActivo;
              return (
                <button
                  key={modulo.id}
                  onClick={() => seleccionarModulo(modulo.id)}
                  className={`w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors mb-1 ${
                    activo ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    {modulo.icon}
                    {modulo.label}
                  </span>
                  {activo && <Check className="h-4 w-4" />}
                </button>
              );
            })}
          </nav>
        )}

        {hayCentros && (
          <nav className="p-2">
            <p className="text-xs font-medium text-gray-500 px-3 pt-1 pb-2">Mis Centros de Costo</p>
            {centros.map((centro) => {
              const activo = centro.id === centroActivo?.id;
              const colores = getCentroCostoColor(centro.nombre);
              return (
                <button
                  key={centro.id}
                  onClick={() => seleccionarCentro(centro)}
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
        )}
      </aside>
    </>
  );
}