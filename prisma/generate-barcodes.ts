import { PrismaClient } from '@prisma/client';
import { generarCodigoBarrasUnico } from '../lib/barcode-generator';

const prisma = new PrismaClient();

async function main() {
  // Obtener todos los productos sin código de barras
  const productos = await prisma.producto.findMany({
    where: {
      OR: [
        { codigoBarras: '' },
        { codigoBarras: null },
      ]
    }
  });

  console.log(`📦 Encontrados ${productos.length} productos sin código de barras`);

  // Generar código de barras para cada producto
  for (const producto of productos) {
    const codigoBarras = await generarCodigoBarrasUnico(producto.codigo, prisma);
    
    await prisma.producto.update({
      where: { id: producto.id },
      data: { codigoBarras },
    });

    console.log(`✅ ${producto.producto} (${producto.codigo}) → ${codigoBarras}`);
  }

  console.log('🎉 ¡Todos los códigos de barras generados!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });