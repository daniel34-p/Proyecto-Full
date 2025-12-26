import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../lib/password';

const prisma = new PrismaClient();

async function main() {
  // Hash de las contraseñas
  const superAdminPassword = await hashPassword('superadmin123');
  const adminPassword = await hashPassword('admin123');
  const asesorPassword = await hashPassword('asesor123');

  // Crear Centros de Costo
  const metroadornos = await prisma.centroCosto.upsert({
    where: { nombre: 'Metroadornos' },
    update: {},
    create: {
      nombre: 'Metroadornos',
      activo: true,
    },
  });

  const metroherrajes = await prisma.centroCosto.upsert({
    where: { nombre: 'Metroherrajes' },
    update: {},
    create: {
      nombre: 'Metroherrajes',
      activo: true,
    },
  });

  console.log('✅ Centros de Costo creados');
  console.log('   📍', metroadornos.nombre);
  console.log('   📍', metroherrajes.nombre);

  // Crear Super Admin (sin centro de costo)
  const superAdmin = await prisma.usuario.upsert({
    where: { email: 'superadmin@inventario.com' },
    update: {
      password: superAdminPassword,
      rol: 'superadmin',
      activo: true,
      centroCostoId: null, // SuperAdmin no tiene centro de costo
    },
    create: {
      email: 'superadmin@inventario.com',
      password: superAdminPassword,
      nombre: 'Super Administrador',
      rol: 'superadmin',
      activo: true,
      centroCostoId: null,
    },
  });

  // Crear Admin para Metroadornos
  const adminMetroadornos = await prisma.usuario.upsert({
    where: { email: 'admin@metroadornos.com' },
    update: {
      password: adminPassword,
      rol: 'admin',
      activo: true,
      centroCostoId: metroadornos.id,
    },
    create: {
      email: 'admin@metroadornos.com',
      password: adminPassword,
      nombre: 'Admin Metroadornos',
      rol: 'admin',
      activo: true,
      centroCostoId: metroadornos.id,
    },
  });

  // Crear Asesor para Metroadornos
  const asesorMetroadornos = await prisma.usuario.upsert({
    where: { email: 'asesor@metroadornos.com' },
    update: {
      password: asesorPassword,
      rol: 'asesor',
      activo: true,
      centroCostoId: metroadornos.id,
    },
    create: {
      email: 'asesor@metroadornos.com',
      password: asesorPassword,
      nombre: 'Asesor Metroadornos',
      rol: 'asesor',
      activo: true,
      centroCostoId: metroadornos.id,
    },
  });

  // Crear Admin para Metroherrajes
  const adminMetroherrajes = await prisma.usuario.upsert({
    where: { email: 'admin@metroherrajes.com' },
    update: {
      password: adminPassword,
      rol: 'admin',
      activo: true,
      centroCostoId: metroherrajes.id,
    },
    create: {
      email: 'admin@metroherrajes.com',
      password: adminPassword,
      nombre: 'Admin Metroherrajes',
      rol: 'admin',
      activo: true,
      centroCostoId: metroherrajes.id,
    },
  });

  console.log('\n✅ Usuarios creados/actualizados:');
  console.log('👑 Super Admin:', superAdmin.email, '- Contraseña: superadmin123');
  console.log('📍 Admin Metroadornos:', adminMetroadornos.email, '- Contraseña: admin123');
  console.log('📍 Asesor Metroadornos:', asesorMetroadornos.email, '- Contraseña: asesor123');
  console.log('📍 Admin Metroherrajes:', adminMetroherrajes.email, '- Contraseña: admin123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });