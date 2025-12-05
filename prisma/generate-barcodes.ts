import { PrismaClient } from '@prisma/client';
import { generarCodigoBarrasUnico } from '../lib/barcode-generator';

const prisma = new PrismaClient();

async function main() {

  const productos = await prisma.producto.findMany({
    where: {
      OR: [
        { codigoBarras: '' },
        { codigoBarras: { equals: undefined } },
      ],
    },
  });

  console.log(`📦 Encontrados ${productos.length} productos sin código de barras`);

  for (const producto of productos) {
    const codigoBarras = await generarCodigoBarrasUnico(
      producto.codigo,
      producto.costo,
      prisma
    );

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
