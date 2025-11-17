<div class="portada">

<div class="logo-container">
  <div class="logo-text">
    <span class="logo-on">on</span><span class="logo-track">Track</span>
  </div>
  <div class="logo-tagline">Tecnología que te acompaña.</div>
</div>

<div class="portada-content">
  <h1 class="portada-title">OnTrack Assistant</h1>
  <h2 class="portada-subtitle">FICHA TÉCNICA</h2>
  <p class="portada-description">Sistema de Análisis de Clases Educativas con Inteligencia Artificial</p>
</div>

</div>

## 1. INFORMACIÓN GENERAL

### 1.1 Descripción del Proyecto

OnTrack Assistant es una plataforma integral diseñada para mejorar la calidad educativa mediante el análisis automático de clases utilizando inteligencia artificial. El sistema permite a los profesores grabar clases, transcribirlas automáticamente, analizar el contenido con IA y obtener insights valiosos sobre su metodología de enseñanza.

### 1.2 Versión del Sistema
- **Backend:** 1.0.0
- **Frontend:** 0.0.0

### 1.3 Licencia
MIT License

### 1.4 Equipo de Desarrollo
OnTrack Team

## 2. ARQUITECTURA DEL SISTEMA

### 2.1 Arquitectura General

```
┌─────────────────────────────────────────────────────────────┐
│                  FRONTEND (React + Vite)                    │
│  • Interfaz de Usuario React 18                            │
│  • Componentes Shadcn/ui                                   │
│  • Tailwind CSS                                            │
│  • Diseño Responsive                                       │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       │ HTTP/REST API
                       │
┌──────────────────────▼──────────────────────────────────────┐
│            BACKEND (Node.js + Express)                      │
│  • API RESTful                                             │
│  • Autenticación JWT                                       │
│  • Procesamiento Asíncrono                                 │
└──────┬──────────────────┬──────────────────┬────────────────┘
       │                  │                  │
┌──────▼──────┐  ┌────────▼────────┐  ┌─────▼─────────┐
│ PostgreSQL  │  │   AWS S3        │  │  APIs Externas│
│ + pgvector  │  │   (Archivos)    │  │  • OpenAI     │
│             │  │                 │  │  • Straico    │
│ • Usuarios  │  │ • Documentos    │  │  • ElevenLabs │
│ • Clases    │  │ • Grabaciones   │  │               │
│ • Vectores  │  │ • Metadatos     │  │               │
└─────────────┘  └─────────────────┘  └───────────────┘
```

### 2.2 Infraestructura en la Nube

**Plataforma:** AWS (Amazon Web Services)

- **Servicios Utilizados:**
  - **AWS EC2/C3** - Servidores de aplicación (Backend y Frontend)
  - **Amazon RDS PostgreSQL** - Base de datos relacional con pgvector
  - **Amazon S3** - Almacenamiento de archivos y documentos
  - **AWS Security Groups** - Configuración de seguridad de red
  - **AWS Load Balancer** - Balanceo de carga (si aplica)

### 2.3 Componentes Principales

1. **Frontend** - Aplicación web SPA (Single Page Application)
2. **Backend** - API REST con Express.js
3. **Base de Datos** - PostgreSQL con extensión pgvector (desplegado en AWS)
4. **Almacenamiento** - AWS S3 para archivos y documentos
5. **IA** - Integración con OpenAI, Straico y ElevenLabs

## 3. BACKEND - ONTRACK BACKEND

### 3.1 Stack Tecnológico

#### Runtime y Framework
- **Node.js** - Entorno de ejecución JavaScript
- **TypeScript** 5.3.3 - Lenguaje de programación tipado
- **Express.js** 4.18.2 - Framework web minimalista
- **Prisma** 5.7.1 - ORM moderno para base de datos

#### Base de Datos
- **PostgreSQL** - Base de datos relacional robusta
- **pgvector** - Extensión para búsqueda vectorial semántica

#### Seguridad y Middleware
- **Helmet** - Seguridad HTTP avanzada
- **CORS** - Control de acceso entre orígenes
- **express-rate-limit** - Limitación de peticiones
- **bcryptjs** - Hash seguro de contraseñas
- **jsonwebtoken** - Autenticación basada en tokens
- **Joi** - Validación de datos robusta

#### Procesamiento de Archivos
- **Multer** - Manejo de uploads multipart
- **mammoth** - Procesamiento de documentos Word
- **pdf-parse** - Extracción de contenido PDF

#### Integraciones de IA
- **OpenAI** - Embeddings y transcripción de audio
- **@xenova/transformers** - Modelos de IA locales
- **@pinecone-database/pinecone** - Vector database (alternativa)
- **chromadb** - Vector database (alternativa)

#### Almacenamiento en la Nube
- **@aws-sdk/client-s3** - Cliente oficial AWS S3
- **@aws-sdk/s3-request-presigner** - URLs firmadas temporales

### 3.2 Características Principales

#### 3.2.1 Autenticación y Autorización
- Sistema de autenticación JWT robusto
- Roles de usuario: SUPER_ADMIN, ADMIN, TEACHER
- Middleware de autenticación en todas las rutas protegidas
- Protección granular de rutas por rol

#### 3.2.2 Gestión de Clases
- Creación y programación de clases
- Estados: SCHEDULED, IN_PROGRESS, COMPLETED, CANCELLED
- Gestión de estudiantes por clase
- Metadatos completos: horarios, ubicación, descripción

#### 3.2.3 Sistema de Grabaciones
- Grabación en tiempo real desde navegador
- Subida de archivos de audio
- Estados: IN_PROGRESS, COMPLETED, FAILED, CANCELLED
- Almacenamiento seguro en AWS S3
- Metadatos: título, descripción, duración

#### 3.2.4 Transcripción Automática
- Integración con OpenAI Whisper API
- Procesamiento automático de archivos de audio
- Identificación básica de hablantes
- Limpieza y formateo inteligente de transcripciones

#### 3.2.5 Análisis con IA
- Integración con Straico API (Claude 3.7 Sonnet)
- Análisis basado en ECDF (Evaluación de Carácter Diagnóstico Formativa)
- Métricas de participación estudiantil
- Identificación automática de conceptos clave
- Sugerencias personalizadas de mejora
- Evaluación general con puntuaciones

#### 3.2.6 Sistema RAG (Retrieval-Augmented Generation)
- Vectorización automática de documentos con OpenAI embeddings
- Búsqueda semántica con pgvector
- Centro de conocimiento para profesores
- Similitud coseno con threshold optimizado
- Enriquecimiento de análisis con contexto de documentos

#### 3.2.7 Centro de Conocimiento
- Subida de documentos (PDF, DOC, DOCX, TXT)
- Categorización automática inteligente
- Sistema de tags flexible
- Búsqueda semántica avanzada
- Vectorización automática
- Estadísticas del centro de conocimiento

### 3.3 Endpoints API

#### Autenticación
- `POST /api/auth/login` - Iniciar sesión
- `POST /api/auth/register` - Registro de usuario
- `GET /api/auth/me` - Obtener usuario actual

#### Clases
- `GET /api/classes` - Listar clases
- `POST /api/classes` - Crear clase
- `GET /api/classes/:id` - Obtener clase
- `PUT /api/classes/:id` - Actualizar clase
- `DELETE /api/classes/:id` - Eliminar clase

#### Estudiantes
- `GET /api/students` - Listar estudiantes
- `POST /api/students` - Crear estudiante
- `GET /api/students/:id` - Obtener estudiante
- `PUT /api/students/:id` - Actualizar estudiante
- `DELETE /api/students/:id` - Eliminar estudiante

#### Grabaciones
- `GET /api/recordings` - Listar grabaciones
- `POST /api/recordings` - Crear grabación
- `GET /api/recordings/:id` - Obtener grabación
- `PUT /api/recordings/:id` - Actualizar grabación
- `DELETE /api/recordings/:id` - Eliminar grabación

#### Análisis
- `POST /api/analysis/transcript` - Analizar transcripción
- `GET /api/analysis/:id` - Obtener análisis
- `GET /api/analysis/recording/:recordingId` - Análisis por grabación

#### Documentos (Centro de Conocimiento)
- `POST /api/documents` - Subir y vectorizar documento
- `GET /api/documents` - Listar documentos
- `GET /api/documents/:id` - Obtener documento
- `GET /api/documents/:id/download` - Descargar documento
- `PUT /api/documents/:id` - Actualizar documento
- `DELETE /api/documents/:id` - Eliminar documento
- `GET /api/documents/search` - Búsqueda semántica
- `GET /api/documents/similar` - Documentos similares
- `GET /api/documents/stats` - Estadísticas
- `POST /api/documents/:id/reprocess` - Re-vectorizar documento

#### Dashboard
- `GET /api/dashboard/stats` - Estadísticas generales
- `GET /api/dashboard/recent` - Actividad reciente

#### Administración
- `GET /api/admin/users` - Listar usuarios
- `POST /api/admin/users` - Crear usuario
- `PUT /api/admin/users/:id` - Actualizar usuario
- `DELETE /api/admin/users/:id` - Eliminar usuario

### 3.4 Modelo de Datos

#### Entidades Principales
- **School** - Instituciones educativas
- **User** - Usuarios del sistema (profesores/admins)
- **Class** - Clases educativas
- **Student** - Estudiantes
- **ClassStudent** - Relación entre clases y estudiantes
- **Recording** - Grabaciones de audio
- **AIAnalysis** - Análisis generados por IA
- **Document** - Documentos del centro de conocimiento
- **DocumentVector** - Vectores embeddings (pgvector)

### 3.5 Variables de Entorno

#### Configuración Básica
- `DATABASE_URL` - URL de conexión a PostgreSQL
- `JWT_SECRET` - Secreto para JWT
- `JWT_EXPIRES_IN` - Tiempo de expiración del token
- `NODE_ENV` - Entorno (development/production)
- `CORS_ORIGIN` - Origen permitido para CORS

#### IA y Análisis
- `STRAICO_API_KEY` - API key de Straico
- `OPENAI_API_KEY` - API key de OpenAI
- `OPENAI_EMBEDDING_MODEL` - Modelo de embeddings

#### Almacenamiento AWS S3
- `AWS_ACCESS_KEY_ID` - Credenciales AWS
- `AWS_SECRET_ACCESS_KEY` - Secret key AWS
- `AWS_REGION` - Región AWS
- `S3_BUCKET_NAME` - Nombre del bucket S3
- `S3_DOCUMENTS_PREFIX` - Prefijo para documentos
- `MAX_FILE_SIZE` - Tamaño máximo de archivo

#### Rate Limiting
- `RATE_LIMIT_WINDOW_MS` - Ventana de tiempo
- `RATE_LIMIT_MAX_REQUESTS` - Máximo de peticiones

### 3.6 Scripts Disponibles
- `npm run build` - Compilar TypeScript
- `npm start` - Iniciar servidor de producción
- `npm run dev` - Desarrollo con nodemon
- `npm run db:generate` - Generar cliente Prisma
- `npm run db:push` - Sincronizar esquema con BD
- `npm run db:migrate` - Ejecutar migraciones
- `npm run db:studio` - Abrir Prisma Studio
- `npm run db:seed` - Poblar base de datos

## 4. FRONTEND - ONTRACK ASSISTANT

### 4.1 Stack Tecnológico

#### Framework y Build
- **React** 18.3.1 - Biblioteca UI moderna
- **TypeScript** 5.5.3 - Lenguaje de programación tipado
- **Vite** 5.4.1 - Build tool ultrarrápido
- **React Router DOM** 6.26.2 - Enrutamiento declarativo

#### UI y Estilos
- **Tailwind CSS** 3.4.11 - Framework CSS utility-first
- **Shadcn/ui** - Componentes UI accesibles (Radix UI)
- **Material-UI** 7.1.1 - Componentes adicionales
- **Lucide React** - Iconos modernos
- **next-themes** - Tema claro/oscuro

#### Estado y Datos
- **TanStack Query** 5.56.2 - Gestión de estado del servidor
- **React Context API** - Estado global
- **Axios** 1.9.0 - Cliente HTTP robusto

#### Formularios y Validación
- **React Hook Form** 7.53.0 - Manejo de formularios
- **Zod** 3.23.8 - Validación de esquemas
- **@hookform/resolvers** - Resolvers para validación

#### Gráficos y Visualización
- **Recharts** 2.12.7 - Gráficos y visualizaciones
- **html2canvas** - Captura de pantalla
- **jspdf** - Generación de PDFs

#### Utilidades
- **date-fns** - Manipulación de fechas
- **clsx** - Utilidad para clases CSS
- **sonner** - Notificaciones toast elegantes

### 4.2 Características Principales

#### 4.2.1 Autenticación
- Login y registro de usuarios
- Protección de rutas por rol
- Gestión de sesión con JWT
- Redirección automática según autenticación

#### 4.2.2 Gestión de Clases
- Creación y edición de clases
- Programación de horarios
- Gestión de estudiantes por clase
- Visualización de detalles de clase
- Estados de clase en tiempo real

#### 4.2.3 Grabación de Clases
- Grabación en tiempo real desde navegador
- Subida de archivos de audio
- Controles de grabación (iniciar/detener/pausar)
- Indicadores de progreso
- Visualización de transcripciones

#### 4.2.4 Análisis de Clases
- Visualización de análisis generados por IA
- Métricas de participación estudiantil
- Conceptos clave identificados
- Momentos importantes destacados
- Sugerencias de mejora
- Evaluación general con puntuaciones

#### 4.2.5 Centro de Conocimiento
- Subida de documentos (PDF, DOC, DOCX, TXT)
- Visualización de documentos
- Búsqueda semántica
- Categorización de documentos
- Sistema de tags
- Estadísticas del centro de conocimiento

#### 4.2.6 Dashboard y Analytics
- Métricas generales del sistema
- Gráficos de actividad
- Estadísticas de clases
- Reportes de análisis
- Actividad reciente

#### 4.2.7 Gestión de Estudiantes
- CRUD completo de estudiantes
- Asignación a clases
- Visualización de perfil
- Historial de participación

#### 4.2.8 Asistente de Voz
- Integración con ElevenLabs
- Asistente de voz interactivo
- Detección de voz
- Respuestas en tiempo real

#### 4.2.9 Panel de Administración
- Gestión de usuarios
- Creación de profesores
- Asignación de roles
- Estadísticas del sistema

### 4.3 Páginas y Rutas

#### Rutas Públicas
- `/login` - Página de inicio de sesión
- `/register` - Página de registro
- `/unauthorized` - Página de acceso no autorizado

#### Rutas Protegidas (Teacher)
- `/home` - Dashboard principal
- `/classes` - Lista de clases
- `/class/:classId` - Detalle de clase
- `/class/:classId/analysis` - Análisis de clase
- `/class/:classId/analysis-page` - Página de análisis
- `/analytics` - Analytics y reportes
- `/documents` - Gestión de documentos
- `/knowledge-center` - Centro de conocimiento
- `/students` - Gestión de estudiantes
- `/feedback` - Sistema de feedback

#### Rutas Protegidas (Super Admin)
- `/admin` - Panel de administración

### 4.4 Estructura del Proyecto

```
src/
├── components/          # Componentes reutilizables
│   ├── Auth/           # Componentes de autenticación
│   ├── Layout/         # Layout principal y sidebars
│   ├── Classes/        # Componentes de clases
│   ├── ClassManagement/# Gestión de clases
│   ├── Admin/          # Componentes de administración
│   └── ui/             # Componentes UI base (Shadcn)
├── contexts/           # Contextos de React
│   ├── AuthContext.tsx
│   ├── ClassContext.tsx
│   ├── DashboardContext.tsx
│   ├── StudentContext.tsx
│   └── ElevenLabsContext.tsx
├── hooks/              # Hooks personalizados
│   ├── use-mobile.tsx
│   ├── use-toast.ts
│   └── useVoiceDetection.ts
├── pages/              # Páginas de la aplicación
├── services/           # Servicios API
│   ├── apiClient.ts
│   ├── authService.ts
│   ├── classesService.ts
│   ├── recordingsService.ts
│   ├── analysisService.ts
│   ├── documentsService.ts
│   ├── ragService.ts
│   ├── studentsService.ts
│   ├── dashboardService.ts
│   ├── adminService.ts
│   └── elevenLabsService.ts
├── types/              # Tipos TypeScript
├── utils/              # Utilidades
└── lib/                # Librerías y configuraciones
```

### 4.5 Variables de Entorno
- `VITE_API_BASE_URL` - URL del backend API
- `VITE_ELEVENLABS_AGENT_ID` - ID del agente de ElevenLabs

### 4.6 Scripts Disponibles
- `npm run dev` - Servidor de desarrollo
- `npm run build` - Build para producción
- `npm run build:dev` - Build en modo desarrollo
- `npm run preview` - Preview del build
- `npm run lint` - Linter de código

## 5. BASE DE DATOS

### 5.1 Sistema de Base de Datos

- **PostgreSQL** - Base de datos relacional robusta
- **pgvector** - Extensión para búsqueda vectorial semántica
- **Prisma ORM** - Gestión de esquema y migraciones
- **Infraestructura:** Desplegado en AWS RDS

### 5.2 Modelos Principales

#### School (Escuelas)
- Información de instituciones educativas
- Relación con usuarios, clases, estudiantes y documentos

#### User (Usuarios)
- Autenticación y autorización
- Roles: SUPER_ADMIN, ADMIN, TEACHER
- Relación con escuela, clases, grabaciones y documentos

#### Class (Clases)
- Información de clases educativas
- Estados: SCHEDULED, IN_PROGRESS, COMPLETED, CANCELLED
- Relación con profesor, escuela, estudiantes y grabaciones

#### Student (Estudiantes)
- Información de estudiantes
- Relación con escuela y clases

#### Recording (Grabaciones)
- Metadatos de grabaciones de audio
- Estados: IN_PROGRESS, COMPLETED, FAILED, CANCELLED
- Relación con clase, profesor y análisis

#### AIAnalysis (Análisis de IA)
- Resultados de análisis generados por IA
- Estados: PENDING, COMPLETED, FAILED
- Datos en formato JSON

#### Document (Documentos)
- Metadatos de documentos del centro de conocimiento
- Estados: PROCESSING, READY, ERROR, VECTORIZED
- Relación con profesor, escuela y vectores

#### DocumentVector (Vectores)
- Embeddings vectoriales de documentos
- Vector de 1536 dimensiones (OpenAI)
- Búsqueda semántica con pgvector

### 5.3 Optimizaciones

- Índices en campos de búsqueda frecuente
- Índices en relaciones (foreign keys)
- Índice vectorial para búsqueda semántica (pgvector)
- Backup automático configurado en AWS RDS

## 6. INTEGRACIONES EXTERNAS

### 6.1 OpenAI
- **Uso:** Transcripción de audio (Whisper) y embeddings (text-embedding-3-small)
- **Funcionalidades:** 
  - Transcripción de audio a texto
  - Generación de embeddings vectoriales
  - Procesamiento de lenguaje natural

### 6.2 Straico API
- **Uso:** Análisis de contenido educativo con Claude 3.7 Sonnet
- **Funcionalidad:** 
  - Análisis ECDF (Evaluación de Carácter Diagnóstico Formativa)
  - Identificación de conceptos clave
  - Sugerencias personalizadas de mejora

### 6.3 ElevenLabs
- **Uso:** Asistente de voz interactivo
- **Funcionalidad:** 
  - Conversación por voz en tiempo real
  - Respuestas contextuales
  - Integración con el sistema de análisis

### 6.4 AWS S3
- **Uso:** Almacenamiento de archivos (grabaciones, documentos)
- **Funcionalidades:**
  - Upload de archivos seguro
  - URLs firmadas para descarga
  - Organización por carpetas
  - Eliminación segura
  - Alta disponibilidad y escalabilidad

## 7. SEGURIDAD

### 7.1 Autenticación
- JWT (JSON Web Tokens) para autenticación
- Tokens con expiración configurable
- Refresh tokens para sesiones prolongadas
- Validación de tokens en cada petición

### 7.2 Autorización
- Sistema de roles: SUPER_ADMIN, ADMIN, TEACHER
- Middleware de autorización por ruta
- Protección de recursos por usuario/escuela
- Control de acceso granular

### 7.3 Seguridad HTTP
- Helmet para headers de seguridad
- CORS configurado y restringido
- Rate limiting para prevenir abuso
- Validación de entrada con Joi
- Sanitización de datos

### 7.4 Almacenamiento
- Contraseñas hasheadas con bcryptjs
- URLs firmadas para S3 con expiración
- Validación de tipos de archivo
- Límites de tamaño de archivo
- Encriptación en tránsito (HTTPS)
- Encriptación en reposo (AWS)

## 8. DEPLOYMENT

### 8.1 Infraestructura en la Nube

**Plataforma:** Amazon Web Services (AWS)

#### Servicios Utilizados:

- **AWS EC2/C3** - Instancias para backend y frontend
- **Amazon RDS PostgreSQL** - Base de datos relacional con pgvector
- **Amazon S3** - Almacenamiento de archivos
- **AWS Security Groups** - Configuración de seguridad de red
- **AWS Load Balancer** - Balanceo de carga (si aplica)
- **AWS CloudWatch** - Monitoreo y logging

### 8.2 Backend

#### Deployment en AWS
- Instancias EC2/C3 para servidores de aplicación
- PM2 para gestión de procesos
- Nginx como reverse proxy
- SSL/TLS con certificados gestionados
- Auto-scaling configurado

#### Requisitos
- Node.js 18+
- PostgreSQL 12+ con pgvector (AWS RDS)
- Variables de entorno configuradas
- Certificados SSL para HTTPS

### 8.3 Frontend

#### Build Estático
- Build optimizado para producción
- Archivos estáticos servidos desde CDN o S3
- Nginx para servir archivos estáticos
- Configuración de proxy para API

#### Requisitos
- Node.js 18+ para build
- Servidor web (Nginx)
- Certificados SSL (recomendado)

### 8.4 Base de Datos

- **PostgreSQL** en AWS RDS
- Extensión pgvector instalada
- Migraciones ejecutadas con Prisma
- Backup automático configurado
- Alta disponibilidad y replicación
- Monitoreo con CloudWatch

### 8.5 CI/CD

- Pipeline de deployment automatizado
- Testing automático
- Build y deployment en AWS
- Rollback automático en caso de errores

## 9. REQUISITOS DEL SISTEMA

### 9.1 Backend
- **Node.js:** 18.0.0 o superior
- **PostgreSQL:** 12.0 o superior (AWS RDS)
- **Memoria RAM:** Mínimo 2GB, recomendado 4GB+
- **Espacio en disco:** Mínimo 10GB
- **CPU:** 2 cores mínimo

### 9.2 Frontend
- **Node.js:** 18.0.0 o superior (para build)
- **Navegadores soportados:**
  - Chrome 90+
  - Firefox 88+
  - Safari 14+
  - Edge 90+

### 9.3 Base de Datos
- **PostgreSQL:** 12.0 o superior (AWS RDS)
- **Extensión:** pgvector
- **Memoria RAM:** Mínimo 2GB, recomendado 4GB+
- **Espacio en disco:** Depende del volumen de datos
- **Backup:** Automático en AWS RDS

### 9.4 Servicios Externos
- **AWS S3:** Cuenta activa con bucket configurado
- **OpenAI API:** Cuenta con API key
- **Straico API:** Cuenta con API key
- **ElevenLabs:** Cuenta con agent ID (opcional)

## 10. COSTOS ESTIMADOS

### 10.1 Infraestructura AWS
- **AWS EC2/C3:** Depende del tamaño de instancia
- **Amazon RDS PostgreSQL:** Depende del tamaño de instancia
- **AWS S3:** Depende del almacenamiento utilizado
- **AWS Data Transfer:** Depende del tráfico

### 10.2 APIs Externas
- **OpenAI:** ~$1-5 USD/mes (uso normal de embeddings y transcripción)
- **Straico:** Depende del plan contratado
- **ElevenLabs:** Depende del plan contratado (opcional)

### 10.3 Total Estimado
- **Mínimo:** ~$50-100 USD/mes
- **Recomendado:** ~$100-200 USD/mes
- **Nota:** Los costos pueden variar según el uso y la región de AWS

## 11. DOCUMENTACIÓN ADICIONAL

### 11.1 Guías Disponibles
- `README.md` - Documentación principal
- `QUICK_START_RAG.md` - Setup rápido del sistema RAG
- `RAG_IMPLEMENTATION_GUIDE.md` - Guía completa de RAG
- `RAG_SYSTEM_GUIDE.md` - Guía del sistema RAG
- `PGVECTOR_SETUP.md` - Configuración de pgvector
- `DOCUMENT_CENTER_GUIDE.md` - Guía del centro de conocimiento
- `CLASS_RECORDING_SETUP.md` - Setup de grabación de clases
- `TESTING_GUIDE.md` - Guía de pruebas
- `DEPLOYMENT_UBUNTU.md` - Deployment en Ubuntu
- `MULTI_USER_ARCHITECTURE.md` - Arquitectura multi-usuario
- `PROTECTION_SYSTEM.md` - Sistema de protección

### 11.2 Scripts de Utilidad
- `scripts/setup-rag-system.sh` - Setup automático de RAG
- `scripts/create-super-admin.ts` - Crear super admin
- `scripts/backup-database.sh` - Backup de base de datos
- `scripts/generate-ssl-certs.sh` - Generar certificados SSL

## 12. CONTACTO Y SOPORTE

### 12.1 Información del Proyecto
- **Nombre:** OnTrack Assistant
- **Versión Backend:** 1.0.0
- **Versión Frontend:** 0.0.0
- **Licencia:** MIT
- **Equipo:** OnTrack Team

### 12.2 Infraestructura
- **Plataforma:** Amazon Web Services (AWS)
- **Región:** Configurada según requisitos
- **Servicios:** EC2/C3, RDS PostgreSQL, S3
- **Monitoreo:** AWS CloudWatch
- **Backup:** Automático en AWS RDS

**Documento generado:** 11 de noviembre de 2025  
**Versión del documento:** 1.0  
**Plataforma:** AWS (Amazon Web Services)
