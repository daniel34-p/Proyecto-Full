/**
 * Genera un código de barras único
 * Formato: 5 letras aleatorias + últimos dígitos del código del producto
 * Ejemplo: codigo "103" → "A2G5P6103"
 */
export function generarCodigoBarras(codigo: string): string {
  const letras = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const numeros = '0123456789';
  
  let codigoBarras = '';
  for (let i = 0; i < 5; i++) {
    const randomIndex = Math.floor(Math.random() * letras.length);
    codigoBarras += letras[randomIndex];
  }
  
  const digitosCodigo = codigo.replace(/\D/g, '');
  
  if (digitosCodigo) {
    const digitosFinales = digitosCodigo.slice(-5);
    codigoBarras += digitosFinales;
  } else {
    for (let i = 0; i < 5; i++) {
      const randomIndex = Math.floor(Math.random() * numeros.length);
      codigoBarras += numeros[randomIndex];
    }
  }
  
  return codigoBarras.substring(0, 10);
}

export async function verificarCodigoBarrasUnico(
  codigoBarras: string,
  prisma: any
): Promise<boolean> {
  const existe = await prisma.producto.findUnique({
    where: { codigoBarras },
  });
  return !existe;
}

export async function generarCodigoBarrasUnico(
  codigo: string,
  prisma: any
): Promise<string> {
  let codigoBarras = generarCodigoBarras(codigo);
  let intentos = 0;
  const maxIntentos = 10;
  
  while (!(await verificarCodigoBarrasUnico(codigoBarras, prisma)) && intentos < maxIntentos) {
    codigoBarras = generarCodigoBarras(codigo);
    intentos++;
  }
  
  if (intentos >= maxIntentos) {
    const timestamp = Date.now().toString().slice(-3);
    codigoBarras = codigoBarras.substring(0, 7) + timestamp;
  }
  
  return codigoBarras;
}