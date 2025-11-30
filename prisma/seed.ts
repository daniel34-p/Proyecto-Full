import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../lib/password';

const prisma = new PrismaClient();

async function main() {
  // Hash de las contraseñas
  const superAdminPassword = await hashPassword('superadmin123');
  const adminPassword = await hashPassword('admin123');
  const asesorPassword = await hashPassword('asesor123');

  // Crear Super Admin
  const superAdmin = await prisma.usuario.upsert({
    where: { email: 'superadmin@inventario.com' },
    update: {
      password: superAdminPassword,
      rol: 'superadmin',
      activo: true,
    },
    create: {
      email: 'superadmin@inventario.com',
      password: superAdminPassword,
      nombre: 'Super Administrador',
      rol: 'superadmin',
      activo: true,
    },
  });

  // Crear Admin
  const admin = await prisma.usuario.upsert({
    where: { email: 'admin@inventario.com' },
    update: {
      password: adminPassword,
      rol: 'admin',
      activo: true,
    },
    create: {
      email: 'admin@inventario.com',
      password: adminPassword,
      nombre: 'Administrador',
      rol: 'admin',
      activo: true,
    },
  });

  // Crear Asesor
  const asesor = await prisma.usuario.upsert({
    where: { email: 'asesor@inventario.com' },
    update: {
      password: asesorPassword,
      rol: 'asesor',
      activo: true,
    },
    create: {
      email: 'asesor@inventario.com',
      password: asesorPassword,
      nombre: 'Asesor de Ventas',
      rol: 'asesor',
      activo: true,
    },
  });

  console.log('✅ Usuarios creados/actualizados:');
  console.log('📧 Super Admin:', superAdmin.email, '- Contraseña: superadmin123');
  console.log('📧 Admin:', admin.email, '- Contraseña: admin123');
  console.log('📧 Asesor:', asesor.email, '- Contraseña: asesor123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });