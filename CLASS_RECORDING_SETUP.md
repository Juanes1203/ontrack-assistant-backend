# Sistema de Grabación y Análisis de Clases - OnTrack

## Descripción

Este sistema permite a los profesores crear/programar clases, grabarlas en tiempo real o subir archivos de audio, transcribir automáticamente el contenido y generar análisis detallados usando IA.

## Funcionalidades Implementadas

### 1. Gestión de Clases
- ✅ Crear y programar clases
- ✅ Estados de clase: SCHEDULED, IN_PROGRESS, COMPLETED, CANCELLED
- ✅ Campos adicionales: descripción, horarios de inicio/fin
- ✅ Gestión de estudiantes en clases

### 2. Sistema de Grabación
- ✅ Grabación en tiempo real desde el navegador
- ✅ Subida de archivos de audio
- ✅ Estados de grabación: IN_PROGRESS, COMPLETED, FAILED, CANCELLED
- ✅ Metadatos: título, descripción, duración

### 3. Transcripción Automática
- ✅ Integración con OpenAI Whisper API
- ✅ Procesamiento automático de archivos de audio
- ✅ Identificación básica de hablantes (Profesor/Estudiante)
- ✅ Limpieza y formateo de transcripciones

### 4. Análisis con IA
- ✅ Integración con Straico API (Claude 3.7 Sonnet)
- ✅ Análisis basado en ECDF (Evaluación de Carácter Diagnóstico Formativa)
- ✅ Métricas de participación estudiantil
- ✅ Identificación de conceptos clave y momentos importantes
- ✅ Sugerencias de mejora
- ✅ Evaluación general con puntuaciones

### 5. Interfaz de Usuario
- ✅ Modal de grabación con controles en tiempo real
- ✅ Visualización de grabaciones y transcripciones
- ✅ Modal de análisis con métricas detalladas
- ✅ Estados de procesamiento en tiempo real

## Configuración

### Variables de Entorno Requeridas

```env
# Base de datos
DATABASE_URL="postgresql://username:password@localhost:5432/ontrack_db?schema=public"

# JWT
JWT_SECRET="your-super-secret-jwt-key-here"
JWT_EXPIRES_IN="7d"

# APIs Externas
STRAICO_API_KEY="your-straico-api-key"
OPENAI_API_KEY="your-openai-api-key"

# Servidor
PORT=3001
CORS_ORIGIN="http://localhost:8080"
```

### Instalación

1. **Instalar dependencias:**
```bash
npm install
```

2. **Configurar base de datos:**
```bash
npx prisma generate
npx prisma db push
```

3. **Configurar variables de entorno:**
```bash
cp env.example .env
# Editar .env con tus claves de API
```

4. **Compilar y ejecutar:**
```bash
npm run build
npm start
```

## API Endpoints

### Clases
- `POST /classes` - Crear clase
- `GET /classes` - Listar clases
- `GET /classes/:id` - Obtener clase específica
- `PUT /classes/:id` - Actualizar clase
- `DELETE /classes/:id` - Eliminar clase

### Grabaciones de Clase
- `POST /classes/:id/recordings/start` - Iniciar grabación
- `POST /classes/:id/recordings/:recordingId/stop` - Detener grabación
- `GET /classes/:id/analyses` - Obtener análisis de clase

### Grabaciones
- `POST /recordings/upload-transcribe` - Subir y transcribir audio
- `POST /recordings/process` - Procesar transcripción con análisis
- `GET /recordings/class/:classId` - Obtener grabaciones de clase
- `GET /recordings/:id` - Obtener grabación específica

### Análisis
- `POST /analysis/transcript` - Analizar transcripción
- `GET /analysis/:id` - Obtener análisis específico
- `GET /analysis/class/:classId` - Obtener análisis de clase

## Flujo de Trabajo

### 1. Crear/Programar Clase
```javascript
const classData = {
  name: "Matemáticas - Álgebra",
  subject: "Matemáticas",
  location: "Aula 101",
  schedule: "Lunes 9:00-10:30",
  maxStudents: 30,
  description: "Introducción al álgebra básica",
  startTime: "2024-01-15T09:00:00Z",
  endTime: "2024-01-15T10:30:00Z"
};

const response = await classesService.createClass(classData);
```

### 2. Iniciar Grabación
```javascript
const recordingData = {
  title: "Clase de Álgebra - Ecuaciones Lineales",
  description: "Explicación de ecuaciones lineales simples"
};

const response = await classesService.startClassRecording(classId, recordingData);
```

### 3. Detener Grabación y Procesar
```javascript
const stopData = {
  transcript: "Transcripción del audio...",
  duration: 3600 // segundos
};

const response = await classesService.stopClassRecording(classId, recordingId, stopData);
// El análisis se inicia automáticamente
```

### 4. Subir Archivo de Audio
```javascript
const formData = new FormData();
formData.append('recording', audioFile);
formData.append('classId', classId);
formData.append('title', 'Clase grabada');

const response = await recordingsService.uploadAndTranscribe(formData);
// La transcripción y análisis se procesan automáticamente
```

## Estructura de Datos

### Clase
```typescript
interface Class {
  id: string;
  name: string;
  subject: string;
  location: string;
  schedule: string;
  maxStudents: number;
  status: 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  description?: string;
  startTime?: DateTime;
  endTime?: DateTime;
  teacherId: string;
  schoolId: string;
}
```

### Grabación
```typescript
interface Recording {
  id: string;
  classId: string;
  teacherId: string;
  title?: string;
  description?: string;
  transcript?: string;
  duration?: number;
  recordingUrl?: string;
  status: 'IN_PROGRESS' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
}
```

### Análisis
```typescript
interface AIAnalysis {
  id: string;
  recordingId: string;
  status: 'PENDING' | 'COMPLETED' | 'FAILED';
  analysisData: {
    summary?: {
      title: string;
      content: string;
      duration: string;
      participants: number;
    };
    keyConcepts?: Array<{
      concept: string;
      description: string;
      importance: string;
      examples: string[];
    }>;
    studentParticipation?: {
      totalInterventions: number;
      activeStudents: number;
      participationRate: number;
      qualityScore: number;
    };
    evaluation?: {
      overallScore: number;
      strengths: string[];
      areasForImprovement: string[];
    };
    // ... más campos
  };
}
```

## Consideraciones Técnicas

### Rendimiento
- Las transcripciones y análisis se procesan en segundo plano
- Los archivos de audio se almacenan localmente en `uploads/recordings/`
- Las transcripciones se procesan con OpenAI Whisper (límite de 25MB por archivo)

### Seguridad
- Autenticación JWT requerida para todas las operaciones
- Validación de permisos por rol (TEACHER/ADMIN)
- Validación de acceso a recursos por usuario

### Escalabilidad
- Procesamiento asíncrono de transcripciones y análisis
- Estados de progreso para seguimiento en tiempo real
- Manejo de errores y reintentos automáticos

## Próximos Pasos

1. **Mejoras de UI/UX:**
   - Indicadores de progreso más detallados
   - Visualizaciones de métricas en tiempo real
   - Exportación de reportes

2. **Funcionalidades Adicionales:**
   - Notificaciones en tiempo real
   - Comparación de análisis entre clases
   - Integración con calendarios

3. **Optimizaciones:**
   - Caché de análisis frecuentes
   - Compresión de archivos de audio
   - CDN para archivos multimedia

## Soporte

Para problemas o preguntas sobre el sistema de grabación y análisis:
1. Verificar logs del servidor
2. Comprobar configuración de APIs externas
3. Validar permisos de base de datos
4. Revisar variables de entorno
