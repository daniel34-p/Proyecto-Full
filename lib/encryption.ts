// Mapeo personalizado de letras a números
const ENCRYPTION_MAP: Record<string, string> = {
  'H': '0',
  'U': '1',
  'B': '2',
  'I': '3',
  'E': '4',
  'R': '5',
  'A': '6',
  'M': '7',
  'O': '8',
  'S': '9',
};

/**
 * Desencripta un costo codificado en letras a su valor numérico
 * Ejemplo: "HUB" -> "012" -> 12
 */
export function desencriptarCosto(costoEncriptado: string): number {
  if (!costoEncriptado) return 0;
  
  const costoUpper = costoEncriptado.toUpperCase().trim();
  let resultado = '';
  
  for (const letra of costoUpper) {
    if (ENCRYPTION_MAP[letra]) {
      resultado += ENCRYPTION_MAP[letra];
    }
  }
  
  return parseInt(resultado) || 0;
}

/**
 * Valida que el costo solo contenga letras válidas del mapeo
 */
export function validarCostoEncriptado(costo: string): boolean {
  if (!costo) return false;
  const costoUpper = costo.toUpperCase().trim();
  return /^[HUBIERAM OS]+$/.test(costoUpper);
}

/**
 * Formatea el costo real como moneda
 */
export function formatearCostoReal(costoReal: number): string {
  return costoReal.toLocaleString('es-CO', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Obtiene la tabla de encriptación para mostrar al usuario
 */
export function obtenerTablaEncriptacion(): Array<{ letra: string; valor: string }> {
  return Object.entries(ENCRYPTION_MAP).map(([letra, valor]) => ({
    letra,
    valor,
  }));
}