import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

async function updateUserToSuperAdmin() {
  try {
    console.log('🔍 Buscando usuarios existentes...');

    // Listar todos los usuarios
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true
      }
    });

    console.log('📋 Usuarios encontrados:');
    users.forEach((user, index) => {
      console.log(`${index + 1}. ${user.firstName} ${user.lastName} (${user.email}) - Rol: ${user.role} - Activo: ${user.isActive}`);
    });

    if (users.length === 0) {
      console.log('❌ No hay usuarios en la base de datos');
      return;
    }

    // Actualizar el primer usuario a SUPER_ADMIN
    const firstUser = users[0];
    console.log(`\n🔄 Actualizando ${firstUser.email} a SUPER_ADMIN...`);

    const updatedUser = await prisma.user.update({
      where: { id: firstUser.id },
      data: { 
        role: 'SUPER_ADMIN',
        isActive: true
      }
    });

    console.log('✅ Usuario actualizado exitosamente!');
    console.log('📧 Email:', updatedUser.email);
    console.log('🆔 ID:', updatedUser.id);
    console.log('🔑 Rol:', updatedUser.role);
    console.log('✅ Activo:', updatedUser.isActive);

  } catch (error) {
    console.error('❌ Error actualizando usuario:', error);
  } finally {
    await prisma.$disconnect();
  }
}

updateUserToSuperAdmin();
