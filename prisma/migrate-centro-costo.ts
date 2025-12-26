// prisma/migrate-centro-costo.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Iniciando migración a Centro de Costo...\n');

  // 1. Crear Centro de Costo principal (Metroadornos - Centro #1)
  console.log('📍 Creando Centro de Costo #1: Metroadornos...');
  const centroCostoPrincipal = await prisma.centroCosto.upsert({
    where: { nombre: 'Metroadornos' },
    update: { activo: true },
    create: {
      nombre: 'Metroadornos',
      activo: true,
    },
  });

  console.log(`✅ Centro de Costo creado: ${centroCostoPrincipal.nombre} (ID: ${centroCostoPrincipal.id})\n`);

  // 2. Contar productos existentes sin centro de costo
  const productosCount = await prisma.producto.count({
    where: {
      OR: [
        { centroCostoId: null },
        { centroCostoId: undefined },
      ],
    },
  });

  console.log(`📦 Productos existentes sin centro de costo: ${productosCount}`);

  if (productosCount > 0) {
    console.log(`⏳ Asignando ${productosCount} productos a Metroadornos...`);
    
    // 3. Actualizar productos en lotes de 100 para mejor rendimiento
    let procesados = 0;
    const BATCH_SIZE = 100;
    
    while (procesados < productosCount) {
      const resultado = await prisma.producto.updateMany({
        where: {
          OR: [
            { centroCostoId: null },
            { centroCostoId: undefined },
          ],
        },
        data: {
          centroCostoId: centroCostoPrincipal.id,
        },
        // Prisma no soporta LIMIT en updateMany, así que lo haremos diferente
      });
      
      procesados += resultado.count;
      console.log(`   ✓ Procesados: ${procesados}/${productosCount}`);
      
      if (resultado.count === 0) break; // No quedan más productos por actualizar
    }

    console.log(`✅ ${procesados} productos asignados a ${centroCostoPrincipal.nombre}\n`);
  } else {
    console.log('✅ Todos los productos ya tienen centro de costo asignado\n');
  }

  // 4. Verificar productos huérfanos
  const productosHuerfanos = await prisma.producto.count({
    where: {
      OR: [
        { centroCostoId: null },
        { centroCostoId: undefined },
      ],
    },
  });

  if (productosHuerfanos > 0) {
    console.warn(`⚠️  Advertencia: ${productosHuerfanos} productos aún sin centro de costo`);
  }

  // 5. Actualizar usuarios existentes
  console.log('👥 Actualizando usuarios...');
  const usuarios = await prisma.usuario.findMany();
  
  let usuariosActualizados = 0;
  
  for (const usuario of usuarios) {
    if (usuario.rol === 'superadmin') {
      // SuperAdmins no tienen centro de costo
      if (usuario.centroCostoId !== null) {
        await prisma.usuario.update({
          where: { id: usuario.id },
          data: { centroCostoId: null },
        });
      }
      console.log(`   👑 ${usuario.nombre} (SuperAdmin) - Sin centro de costo`);
    } else {
      // Asignar centro de costo principal a otros usuarios si no lo tienen
      if (!usuario.centroCostoId) {
        await prisma.usuario.update({
          where: { id: usuario.id },
          data: { centroCostoId: centroCostoPrincipal.id },
        });
        usuariosActualizados++;
        console.log(`   ✅ ${usuario.nombre} (${usuario.rol}) → ${centroCostoPrincipal.nombre}`);
      } else {
        console.log(`   ✓ ${usuario.nombre} (${usuario.rol}) ya tiene centro de costo`);
      }
    }
  }

  console.log(`\n✅ ${usuariosActualizados} usuarios actualizados`);

  // 6. Resumen final
  console.log('\n📊 RESUMEN DE MIGRACIÓN:');
  console.log('═══════════════════════════════════════');
  
  const centrosCosto = await prisma.centroCosto.findMany();
  for (const centro of centrosCosto) {
    const productosEnCentro = await prisma.producto.count({
      where: { centroCostoId: centro.id },
    });
    const usuariosEnCentro = await prisma.usuario.count({
      where: { centroCostoId: centro.id },
    });
    
    console.log(`📍 ${centro.nombre}:`);
    console.log(`   • Productos: ${productosEnCentro}`);
    console.log(`   • Usuarios: ${usuariosEnCentro}`);
  }

  const superAdmins = await prisma.usuario.count({
    where: { rol: 'superadmin' },
  });
  console.log(`👑 SuperAdmins: ${superAdmins}`);
  
  console.log('═══════════════════════════════════════');
  console.log('🎉 ¡Migración completada exitosamente!');
}

main()
  .catch((e) => {
    console.error('\n❌ Error en migración:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });