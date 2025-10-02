import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixUserRoles() {
  try {
    console.log('🔧 Iniciando corrección de roles de usuario...\n');

    // 1. Restaurar teacher@ontrack.com a rol TEACHER
    console.log('📝 Restaurando teacher@ontrack.com a rol TEACHER...');
    const teacher = await prisma.user.update({
      where: { email: 'teacher@ontrack.com' },
      data: { role: 'TEACHER' }
    });
    console.log('✅ Usuario teacher@ontrack.com restaurado a TEACHER');
    console.log(`   - ID: ${teacher.id}`);
    console.log(`   - Email: ${teacher.email}`);
    console.log(`   - Rol: ${teacher.role}\n`);

    // 2. Crear SUPER_ADMIN dedicado
    console.log('👑 Creando SUPER_ADMIN dedicado...');
    
    // Verificar si ya existe
    const existingSuperAdmin = await prisma.user.findUnique({
      where: { email: 'superadmin@ontrack.global' }
    });

    if (existingSuperAdmin) {
      console.log('⚠️  SUPER_ADMIN ya existe, actualizando...');
      const superAdmin = await prisma.user.update({
        where: { email: 'superadmin@ontrack.global' },
        data: { 
          role: 'SUPER_ADMIN',
          isActive: true
        }
      });
      console.log('✅ SUPER_ADMIN actualizado');
    } else {
      const superAdmin = await prisma.user.create({
        data: {
          email: 'superadmin@ontrack.global',
          password: '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', // SuperAdmin123!
          firstName: 'Super',
          lastName: 'Admin',
          role: 'SUPER_ADMIN',
          schoolId: 'default-school',
          isActive: true
        }
      });
      console.log('✅ SUPER_ADMIN creado');
    }

    // 3. Mostrar todos los usuarios
    console.log('\n📋 Usuarios en el sistema:');
    const allUsers = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        createdAt: true
      },
      orderBy: { createdAt: 'asc' }
    });

    allUsers.forEach((user, index) => {
      console.log(`   ${index + 1}. ${user.email}`);
      console.log(`      - Nombre: ${user.firstName} ${user.lastName}`);
      console.log(`      - Rol: ${user.role}`);
      console.log(`      - Activo: ${user.isActive ? 'Sí' : 'No'}`);
      console.log(`      - Creado: ${user.createdAt.toISOString()}\n`);
    });

    // 4. Credenciales de acceso
    console.log('🔑 Credenciales de acceso:');
    console.log('   👨‍🏫 PROFESOR:');
    console.log('      - Email: teacher@ontrack.com');
    console.log('      - Contraseña: teacher123');
    console.log('      - Funciones: Gestión de clases, estudiantes, documentos\n');
    
    console.log('   👑 SUPER ADMIN:');
    console.log('      - Email: superadmin@ontrack.global');
    console.log('      - Contraseña: SuperAdmin123!');
    console.log('      - Funciones: Gestión de usuarios, panel de administración\n');

    console.log('🎯 ¡Corrección completada exitosamente!');

  } catch (error) {
    console.error('❌ Error al corregir roles:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixUserRoles();