/**
 * Genera un color consistente para un centro de costo basado en su nombre
 * Usa el mismo nombre para obtener siempre el mismo color
 */

export interface CentroCostoColor {
  bg: string;        // Background color (light)
  text: string;      // Text color (dark)
  border: string;    // Border color (medium)
  badge: string;     // Badge color (medium)
}

// Paleta de colores predefinida para centros de costo
const PALETA_COLORES: CentroCostoColor[] = [
  {
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    border: 'border-blue-300',
    badge: 'bg-blue-100',
  },
  {
    bg: 'bg-purple-50',
    text: 'text-purple-700',
    border: 'border-purple-300',
    badge: 'bg-purple-100',
  },
  {
    bg: 'bg-green-50',
    text: 'text-green-700',
    border: 'border-green-300',
    badge: 'bg-green-100',
  },
  {
    bg: 'bg-orange-50',
    text: 'text-orange-700',
    border: 'border-orange-300',
    badge: 'bg-orange-100',
  },
  {
    bg: 'bg-pink-50',
    text: 'text-pink-700',
    border: 'border-pink-300',
    badge: 'bg-pink-100',
  },
  {
    bg: 'bg-indigo-50',
    text: 'text-indigo-700',
    border: 'border-indigo-300',
    badge: 'bg-indigo-100',
  },
  {
    bg: 'bg-teal-50',
    text: 'text-teal-700',
    border: 'border-teal-300',
    badge: 'bg-teal-100',
  },
  {
    bg: 'bg-cyan-50',
    text: 'text-cyan-700',
    border: 'border-cyan-300',
    badge: 'bg-cyan-100',
  },
  {
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    border: 'border-amber-300',
    badge: 'bg-amber-100',
  },
  {
    bg: 'bg-rose-50',
    text: 'text-rose-700',
    border: 'border-rose-300',
    badge: 'bg-rose-100',
  },
];

/**
 * Genera un hash simple de un string
 */
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

/**
 * Obtiene el color para un centro de costo basado en su nombre
 * Siempre retorna el mismo color para el mismo nombre
 */
export function getCentroCostoColor(nombreCentro: string): CentroCostoColor {
  const hash = hashString(nombreCentro.toLowerCase());
  const index = hash % PALETA_COLORES.length;
  return PALETA_COLORES[index];
}

/**
 * Obtiene el color para un centro de costo basado en su ID
 * Útil cuando tienes el objeto completo
 */
export function getCentroCostoColorById(centroCosto: { id: string; nombre: string }): CentroCostoColor {
  return getCentroCostoColor(centroCosto.nombre);
}

/**
 * Genera clases CSS inline para un centro de costo
 */
export function getCentroCostoStyles(nombreCentro: string) {
  const colors = getCentroCostoColor(nombreCentro);
  return {
    backgroundColor: getColorValue(colors.bg),
    color: getColorValue(colors.text),
    borderColor: getColorValue(colors.border),
  };
}

/**
 * Mapeo de clases Tailwind a valores CSS
 */
function getColorValue(className: string): string {
  const colorMap: Record<string, string> = {
    // Blue
    'bg-blue-50': '#eff6ff',
    'text-blue-700': '#1d4ed8',
    'border-blue-300': '#93c5fd',
    // Purple
    'bg-purple-50': '#faf5ff',
    'text-purple-700': '#7e22ce',
    'border-purple-300': '#d8b4fe',
    // Green
    'bg-green-50': '#f0fdf4',
    'text-green-700': '#15803d',
    'border-green-300': '#86efac',
    // Orange
    'bg-orange-50': '#fff7ed',
    'text-orange-700': '#c2410c',
    'border-orange-300': '#fdba74',
    // Pink
    'bg-pink-50': '#fdf2f8',
    'text-pink-700': '#be185d',
    'border-pink-300': '#f9a8d4',
    // Indigo
    'bg-indigo-50': '#eef2ff',
    'text-indigo-700': '#4338ca',
    'border-indigo-300': '#a5b4fc',
    // Teal
    'bg-teal-50': '#f0fdfa',
    'text-teal-700': '#0f766e',
    'border-teal-300': '#5eead4',
    // Cyan
    'bg-cyan-50': '#ecfeff',
    'text-cyan-700': '#0e7490',
    'border-cyan-300': '#67e8f9',
    // Amber
    'bg-amber-50': '#fffbeb',
    'text-amber-700': '#b45309',
    'border-amber-300': '#fcd34d',
    // Rose
    'bg-rose-50': '#fff1f2',
    'text-rose-700': '#be123c',
    'border-rose-300': '#fda4af',
  };
  
  return colorMap[className] || '#000000';
}