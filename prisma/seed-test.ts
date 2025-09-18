import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding test data...');

  // Create a school
  const school = await prisma.school.create({
    data: {
      name: 'Escuela de Prueba OnTrack',
      address: 'Calle Principal 123, Ciudad'
    }
  });

  console.log('✅ School created:', school.name);

  // Create an admin user
  const adminPassword = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.create({
    data: {
      email: 'admin@ontrack.com',
      password: adminPassword,
      firstName: 'Admin',
      lastName: 'OnTrack',
      role: 'ADMIN',
      schoolId: school.id
    }
  });

  console.log('✅ Admin user created:', admin.email);

  // Create a teacher user
  const teacherPassword = await bcrypt.hash('teacher123', 10);
  const teacher = await prisma.user.create({
    data: {
      email: 'profesor@ontrack.com',
      password: teacherPassword,
      firstName: 'Juan',
      lastName: 'Pérez',
      role: 'TEACHER',
      schoolId: school.id
    }
  });

  console.log('✅ Teacher user created:', teacher.email);

  // Create some students
  const students = await Promise.all([
    prisma.student.create({
      data: {
        firstName: 'María',
        lastName: 'García',
        email: 'maria@student.com',
        schoolId: school.id
      }
    }),
    prisma.student.create({
      data: {
        firstName: 'Carlos',
        lastName: 'López',
        email: 'carlos@student.com',
        schoolId: school.id
      }
    }),
    prisma.student.create({
      data: {
        firstName: 'Ana',
        lastName: 'Martínez',
        email: 'ana@student.com',
        schoolId: school.id
      }
    })
  ]);

  console.log('✅ Students created:', students.length);

  // Create some classes
  const class1 = await prisma.class.create({
    data: {
      name: 'Matemáticas Básicas',
      subject: 'Matemáticas',
      location: 'Aula 101',
      schedule: 'Lunes y Miércoles 9:00-10:30',
      maxStudents: 25,
      teacherId: teacher.id,
      schoolId: school.id,
      description: 'Introducción a las matemáticas básicas',
      status: 'SCHEDULED'
    }
  });

  const class2 = await prisma.class.create({
    data: {
      name: 'Historia Universal',
      subject: 'Historia',
      location: 'Aula 205',
      schedule: 'Martes y Jueves 14:00-15:30',
      maxStudents: 30,
      teacherId: teacher.id,
      schoolId: school.id,
      description: 'Estudio de la historia mundial',
      status: 'SCHEDULED'
    }
  });

  console.log('✅ Classes created:', 2);

  // Add students to classes
  await prisma.classStudent.createMany({
    data: [
      { classId: class1.id, studentId: students[0].id },
      { classId: class1.id, studentId: students[1].id },
      { classId: class2.id, studentId: students[1].id },
      { classId: class2.id, studentId: students[2].id }
    ]
  });

  console.log('✅ Students enrolled in classes');

  // Create a sample recording with analysis
  const recording = await prisma.recording.create({
    data: {
      classId: class1.id,
      teacherId: teacher.id,
      title: 'Clase de Introducción - Números Enteros',
      description: 'Primera clase sobre números enteros y operaciones básicas',
      transcript: `Profesor: Buenos días estudiantes, hoy comenzaremos con el tema de números enteros.

Estudiante: ¿Profesor, qué son los números enteros?

Profesor: Excelente pregunta. Los números enteros son todos los números naturales, sus opuestos y el cero. Incluyen números positivos como 1, 2, 3, y negativos como -1, -2, -3.

Estudiante: ¿Y el cero es positivo o negativo?

Profesor: El cero no es ni positivo ni negativo, es neutro. Es muy importante recordar esto.

Estudiante: Entiendo, profesor.

Profesor: Ahora vamos a practicar con algunas operaciones básicas. Empecemos con la suma de enteros...`,
      duration: 1800, // 30 minutes
      status: 'COMPLETED'
    }
  });

  // Create a sample analysis
  const analysis = await prisma.aIAnalysis.create({
    data: {
      recordingId: recording.id,
      status: 'COMPLETED',
      analysisData: JSON.stringify({
        summary: {
          title: 'Introducción a Números Enteros',
          content: 'Clase introductoria sobre números enteros con buena participación estudiantil y explicaciones claras.',
          duration: '30 minutos',
          participants: 3
        },
        keyConcepts: [
          {
            concept: 'Números Enteros',
            description: 'Definición y características de los números enteros',
            importance: 'Alta',
            examples: ['1, 2, 3', '-1, -2, -3', '0']
          },
          {
            concept: 'Número Cero',
            description: 'El cero como número neutro',
            importance: 'Media',
            examples: ['No es positivo ni negativo']
          }
        ],
        studentParticipation: {
          totalInterventions: 3,
          activeStudents: 2,
          participationRate: 75,
          qualityScore: 8
        },
        keyMoments: [
          {
            timestamp: '2:30',
            description: 'Pregunta sobre definición de números enteros',
            importance: 'high'
          },
          {
            timestamp: '5:15',
            description: 'Explicación del cero como número neutro',
            importance: 'high'
          }
        ],
        suggestions: [
          'Incluir más ejemplos visuales en la pizarra',
          'Realizar ejercicios prácticos en grupo',
          'Usar analogías para explicar conceptos abstractos'
        ],
        evaluation: {
          overallScore: 8,
          strengths: [
            'Explicaciones claras y estructuradas',
            'Buena interacción con estudiantes',
            'Respuestas directas a preguntas'
          ],
          areasForImprovement: [
            'Incluir más actividades prácticas',
            'Usar material visual complementario'
          ]
        }
      })
    }
  });

  console.log('✅ Sample recording and analysis created');

  console.log('🎉 Test data seeded successfully!');
  console.log('\n📋 Test Accounts:');
  console.log('Admin: admin@ontrack.com / admin123');
  console.log('Teacher: profesor@ontrack.com / teacher123');
  console.log('\n📚 Sample Classes:');
  console.log('- Matemáticas Básicas (Aula 101)');
  console.log('- Historia Universal (Aula 205)');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding data:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
