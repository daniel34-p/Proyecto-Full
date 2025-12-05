/**
 * Genera un código de barras único
 * Formato NUEVO: 7 letras aleatorias + costo (letras) + código del producto
 * Ejemplo: codigo "103" + costo "HUB" → "A2G5PQR" + "HUB" + "103" = "A2G5PQRHUB103"
 */
export function generarCodigoBarras(codigo: string, costo: string): string {
  const letras = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  
  // 1. Generar 7 letras aleatorias
  let codigoBarras = '';
  for (let i = 0; i < 6; i++) {
    const randomIndex = Math.floor(Math.random() * letras.length);
    codigoBarras += letras[randomIndex];
  }

  // 3. Agregar el código del producto al final
  const digitosCodigo = codigo.replace(/\D/g, '');
  codigoBarras += digitosCodigo;
  
  // 2. Agregar el costo encriptado (letras)
  const costoLimpio = costo.toUpperCase().replace(/[^A-Z]/g, '');
  codigoBarras += costoLimpio;
  
  return codigoBarras;
}

/**
 * Verifica si un código de barras ya existe en la base de datos
 */
export async function verificarCodigoBarrasUnico(
  codigoBarras: string,
  prisma: any
): Promise<boolean> {
  const existe = await prisma.producto.findUnique({
    where: { codigoBarras },
  });
  return !existe;
}

/**
 * Genera un código de barras único (reintenta si hay duplicados)
 */
export async function generarCodigoBarrasUnico(
  codigo: string,
  costo: string,
  prisma: any
): Promise<string> {
  let codigoBarras = generarCodigoBarras(codigo, costo);
  let intentos = 0;
  const maxIntentos = 10;
  
  // Reintentar si el código ya existe
  while (!(await verificarCodigoBarrasUnico(codigoBarras, prisma)) && intentos < maxIntentos) {
    codigoBarras = generarCodigoBarras(codigo, costo);
    intentos++;
  }
  
  // Si después de 10 intentos sigue duplicado, agregar timestamp
  if (intentos >= maxIntentos) {
    const timestamp = Date.now().toString().slice(-3);
    codigoBarras = codigoBarras.substring(0, codigoBarras.length - 3) + timestamp;
  }
  
  return codigoBarras;
}