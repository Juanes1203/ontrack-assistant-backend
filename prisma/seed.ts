import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Create default school
  const school = await prisma.school.upsert({
    where: { id: 'default-school' },
    update: {},
    create: {
      id: 'default-school',
      name: 'Escuela Demo OnTrack',
      address: 'Calle Demo 123, Ciudad Demo'
    }
  });

  console.log('✅ School created:', school.name);

  // Create admin user
  const adminPassword = await bcrypt.hash('admin123', 12);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@ontrack.com' },
    update: {},
    create: {
      email: 'admin@ontrack.com',
      password: adminPassword,
      firstName: 'Admin',
      lastName: 'OnTrack',
      role: 'ADMIN',
      schoolId: school.id
    }
  });

  console.log('✅ Admin user created:', admin.email);

  // Create teacher user
  const teacherPassword = await bcrypt.hash('teacher123', 12);
  const teacher = await prisma.user.upsert({
    where: { email: 'teacher@ontrack.com' },
    update: {},
    create: {
      email: 'teacher@ontrack.com',
      password: teacherPassword,
      firstName: 'Juan',
      lastName: 'Pérez',
      role: 'TEACHER',
      schoolId: school.id
    }
  });

  console.log('✅ Teacher user created:', teacher.email);

  // Create sample students
  const students = await Promise.all([
    prisma.student.upsert({
      where: { id: 'student-1' },
      update: {},
      create: {
        id: 'student-1',
        firstName: 'María',
        lastName: 'González',
        email: 'maria.gonzalez@student.com',
        avatarUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&h=150&fit=crop&crop=face',
        schoolId: school.id
      }
    }),
    prisma.student.upsert({
      where: { id: 'student-2' },
      update: {},
      create: {
        id: 'student-2',
        firstName: 'Carlos',
        lastName: 'Rodríguez',
        email: 'carlos.rodriguez@student.com',
        avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face',
        schoolId: school.id
      }
    }),
    prisma.student.upsert({
      where: { id: 'student-3' },
      update: {},
      create: {
        id: 'student-3',
        firstName: 'Ana',
        lastName: 'Martínez',
        email: 'ana.martinez@student.com',
        avatarUrl: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face',
        schoolId: school.id
      }
    }),
    prisma.student.upsert({
      where: { id: 'student-4' },
      update: {},
      create: {
        id: 'student-4',
        firstName: 'Luis',
        lastName: 'Fernández',
        email: 'luis.fernandez@student.com',
        avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
        schoolId: school.id
      }
    }),
    prisma.student.upsert({
      where: { id: 'student-5' },
      update: {},
      create: {
        id: 'student-5',
        firstName: 'Valentina',
        lastName: 'García',
        email: 'valentina.garcia@student.com',
        avatarUrl: 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=150&h=150&fit=crop&crop=face',
        schoolId: school.id
      }
    })
  ]);

  console.log('✅ Students created:', students.length);

  // Create sample classes
  const class1 = await prisma.class.upsert({
    where: { id: 'class-1' },
    update: {},
    create: {
      id: 'class-1',
      name: 'Introducción a React',
      subject: 'Programación Web',
      location: 'Aula 101',
      schedule: 'Lunes y Miércoles 9:00-11:00',
      maxStudents: 25,
      teacherId: teacher.id,
      schoolId: school.id
    }
  });

  const class2 = await prisma.class.upsert({
    where: { id: 'class-2' },
    update: {},
    create: {
      id: 'class-2',
      name: 'Historia del Arte',
      subject: 'Arte y Cultura',
      location: 'Aula 205',
      schedule: 'Martes y Jueves 14:00-16:00',
      maxStudents: 30,
      teacherId: teacher.id,
      schoolId: school.id
    }
  });

  console.log('✅ Classes created:', 2);

  // Enroll students in classes
  await prisma.classStudent.createMany({
    data: [
      { classId: class1.id, studentId: students[0].id },
      { classId: class1.id, studentId: students[1].id },
      { classId: class1.id, studentId: students[2].id },
      { classId: class2.id, studentId: students[2].id },
      { classId: class2.id, studentId: students[3].id },
      { classId: class2.id, studentId: students[4].id }
    ],
    skipDuplicates: true
  });

  console.log('✅ Students enrolled in classes');

  console.log('🎉 Database seed completed successfully!');
  console.log('\n📋 Test Accounts:');
  console.log('Admin: admin@ontrack.com / admin123');
  console.log('Teacher: teacher@ontrack.com / teacher123');
}

main()
  .catch((e) => {
    console.error('❌ Error during seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
