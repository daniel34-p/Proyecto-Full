// Mapeo de letras a números
const ENCRYPTION_MAP: Record<string, string> = {
  'A': '1',
  'B': '2',
  'C': '3',
  'D': '4',
  'E': '5',
  'F': '6',
  'G': '7',
  'H': '8',
  'I': '9',
  'J': '0',
  'K': '1',
  'L': '2',
  'M': '3',
  'N': '4',
  'O': '5',
  'P': '6',
  'Q': '7',
  'R': '8',
  'S': '9',
  'T': '0',
  'U': '1',
  'V': '2',
  'W': '3',
  'X': '4',
  'Y': '5',
  'Z': '6',
};

/**
 * Desencripta un costo codificado en letras a su valor numérico
 * Ejemplo: "XDF" -> "446" -> 446
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
 * Valida que el costo solo contenga letras válidas
 */
export function validarCostoEncriptado(costo: string): boolean {
  if (!costo) return false;
  const costoUpper = costo.toUpperCase().trim();
  return /^[A-Z]+$/.test(costoUpper);
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