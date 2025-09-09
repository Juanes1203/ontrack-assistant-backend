import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'OnTrack Backend API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Simple auth endpoint
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  
  if (email === 'teacher@ontrack.com' && password === 'teacher123') {
    res.json({
      success: true,
      data: {
        user: {
          id: '1',
          email: 'teacher@ontrack.com',
          firstName: 'Juan',
          lastName: 'Pérez',
          role: 'TEACHER',
          schoolId: 'default-school'
        },
        token: 'mock-jwt-token',
        expiresIn: 7 * 24 * 60 * 60 * 1000
      },
      message: 'Login successful'
    });
  } else if (email === 'admin@ontrack.com' && password === 'admin123') {
    res.json({
      success: true,
      data: {
        user: {
          id: '2',
          email: 'admin@ontrack.com',
          firstName: 'Admin',
          lastName: 'OnTrack',
          role: 'ADMIN',
          schoolId: 'default-school'
        },
        token: 'mock-jwt-token-admin',
        expiresIn: 7 * 24 * 60 * 60 * 1000
      },
      message: 'Login successful'
    });
  } else {
    res.status(401).json({
      success: false,
      error: 'Invalid credentials'
    });
  }
});

// Mock classes endpoint
app.get('/api/classes', (req, res) => {
  res.json({
    success: true,
    data: [
      {
        id: 'class-1',
        name: 'Introducción a React',
        subject: 'Programación Web',
        location: 'Aula 101',
        schedule: 'Lunes y Miércoles 9:00-11:00',
        maxStudents: 25,
        teacherId: '1',
        schoolId: 'default-school',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        teacher: {
          id: '1',
          firstName: 'Juan',
          lastName: 'Pérez',
          email: 'teacher@ontrack.com'
        },
        school: {
          id: 'default-school',
          name: 'Escuela Demo OnTrack'
        },
        classStudents: [
          {
            id: 'cs-1',
            classId: 'class-1',
            studentId: 'student-1',
            enrolledAt: new Date().toISOString(),
            status: 'ACTIVE',
            student: {
              id: 'student-1',
              firstName: 'María',
              lastName: 'González',
              avatarUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&h=150&fit=crop&crop=face'
            }
          }
        ],
        _count: {
          classStudents: 1,
          recordings: 0
        }
      },
      {
        id: 'class-2',
        name: 'Historia del Arte',
        subject: 'Arte y Cultura',
        location: 'Aula 205',
        schedule: 'Martes y Jueves 14:00-16:00',
        maxStudents: 30,
        teacherId: '1',
        schoolId: 'default-school',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        teacher: {
          id: '1',
          firstName: 'Juan',
          lastName: 'Pérez',
          email: 'teacher@ontrack.com'
        },
        school: {
          id: 'default-school',
          name: 'Escuela Demo OnTrack'
        },
        classStudents: [],
        _count: {
          classStudents: 0,
          recordings: 0
        }
      }
    ],
    pagination: {
      page: 1,
      limit: 10,
      total: 2,
      totalPages: 1
    }
  });
});

// Mock students endpoint
app.get('/api/students', (req, res) => {
  res.json({
    success: true,
    data: [
      {
        id: 'student-1',
        firstName: 'María',
        lastName: 'González',
        email: 'maria.gonzalez@student.com',
        avatarUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&h=150&fit=crop&crop=face',
        schoolId: 'default-school',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        classStudents: [],
        _count: {
          classStudents: 0
        }
      },
      {
        id: 'student-2',
        firstName: 'Carlos',
        lastName: 'Rodríguez',
        email: 'carlos.rodriguez@student.com',
        avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face',
        schoolId: 'default-school',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        classStudents: [],
        _count: {
          classStudents: 0
        }
      }
    ],
    pagination: {
      page: 1,
      limit: 10,
      total: 2,
      totalPages: 1
    }
  });
});

// Mock analysis endpoint
app.post('/api/analysis/transcript', (req, res) => {
  const { transcript, classId } = req.body;
  
  res.json({
    success: true,
    data: {
      recordingId: 'recording-' + Date.now(),
      analysisId: 'analysis-' + Date.now(),
      status: 'pending'
    },
    message: 'Análisis iniciado correctamente'
  });
});

// Mock get analysis endpoint
app.get('/api/analysis/:id', (req, res) => {
  res.json({
    success: true,
    data: {
      id: req.params.id,
      recordingId: 'recording-123',
      analysisData: {
        summary: {
          title: "Resumen de la Clase",
          content: "La clase se desarrolló de manera dinámica con participación activa de los estudiantes.",
          duration: "45 minutos",
          participants: 25
        },
        keyConcepts: [
          {
            concept: "Conceptos Fundamentales",
            description: "Se introdujeron los conceptos básicos del tema",
            importance: "Alta",
            examples: ["Ejemplo 1", "Ejemplo 2"]
          }
        ],
        studentParticipation: {
          totalInterventions: 15,
          activeStudents: 12,
          participationRate: 80,
          qualityScore: 8.5
        },
        keyMoments: [
          {
            timestamp: "00:15:30",
            description: "Momento clave de la explicación",
            importance: "Alta"
          }
        ],
        suggestions: [
          "Incrementar la participación de estudiantes más tímidos",
          "Usar más ejemplos prácticos"
        ],
        evaluation: {
          overallScore: 8.2,
          strengths: ["Claridad en la explicación", "Buena participación"],
          areasForImprovement: ["Tiempo de transición", "Ejemplos prácticos"]
        }
      },
      status: 'COMPLETED',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  });
});

// Mock recordings endpoints
app.post('/api/recordings', (req, res) => {
  const { classId, transcript, duration } = req.body;
  
  res.json({
    success: true,
    data: {
      id: 'recording-' + Date.now(),
      classId,
      teacherId: 'teacher-1',
      transcript: transcript || '',
      duration: duration || 0,
      recordingUrl: null,
      metadata: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    message: 'Recording created successfully'
  });
});

app.get('/api/recordings/:id', (req, res) => {
  res.json({
    success: true,
    data: {
      id: req.params.id,
      classId: 'class-1',
      teacherId: 'teacher-1',
      transcript: 'Esta es una transcripción de prueba de la clase.',
      duration: 1800, // 30 minutes
      recordingUrl: null,
      metadata: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      class: {
        id: 'class-1',
        name: 'Matemáticas Básicas',
        description: 'Clase de matemáticas para estudiantes de primaria'
      },
      teacher: {
        id: 'teacher-1',
        firstName: 'Juan',
        lastName: 'Pérez',
        email: 'juan.perez@teacher.com'
      },
      aiAnalyses: []
    }
  });
});

app.get('/api/recordings/class/:classId', (req, res) => {
  res.json({
    success: true,
    data: [
      {
        id: 'recording-1',
        classId: req.params.classId,
        teacherId: 'teacher-1',
        transcript: 'Transcripción de la primera grabación',
        duration: 1800,
        recordingUrl: null,
        metadata: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        class: {
          id: req.params.classId,
          name: 'Matemáticas Básicas'
        },
        teacher: {
          id: 'teacher-1',
          firstName: 'Juan',
          lastName: 'Pérez'
        },
        aiAnalyses: [
          {
            id: 'analysis-1',
            status: 'COMPLETED',
            createdAt: new Date().toISOString()
          }
        ]
      }
    ],
    pagination: {
      page: 1,
      limit: 10,
      total: 1,
      totalPages: 1
    }
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📝 Health check: http://localhost:${PORT}/health`);
});

export default app;
