import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

async function createSuperAdmin() {
  try {
    console.log('🚀 Creando Super Administrador...');

    const email = 'superadmin@ontrack.global';
    const password = 'SuperAdmin123!';
    const firstName = 'Super';
    const lastName = 'Administrador';

    // Verificar si ya existe
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      console.log('⚠️  El Super Administrador ya existe');
      return;
    }

    // Encriptar contraseña
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Crear super admin
    const superAdmin = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        firstName,
        lastName,
        role: 'SUPER_ADMIN',
        schoolId: 'default-school',
        isActive: true
      }
    });

    console.log('✅ Super Administrador creado exitosamente!');
    console.log('📧 Email:', email);
    console.log('🔑 Contraseña:', password);
    console.log('🆔 ID:', superAdmin.id);
    console.log('');
    console.log('⚠️  IMPORTANTE: Cambia la contraseña después del primer login');

  } catch (error) {
    console.error('❌ Error creando Super Administrador:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createSuperAdmin();
