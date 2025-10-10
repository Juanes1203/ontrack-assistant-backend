# OnTrack Backend

API backend para el sistema de análisis de clases educativas con inteligencia artificial.

## 🚀 Características

- **Autenticación JWT**: Sistema de login seguro con roles
- **Base de Datos PostgreSQL**: Almacenamiento robusto con Prisma ORM
- **APIs RESTful**: Endpoints para todas las operaciones
- **Análisis con IA**: Integración con Straico API
- **🧠 Sistema RAG**: Búsqueda semántica con OpenAI + pgvector
- **📚 Centro de Conocimiento**: Vectorización automática de documentos
- **Upload de Archivos**: Gestión de grabaciones y documentos en S3
- **Validación**: Validación robusta con Joi
- **Seguridad**: Middleware de seguridad con Helmet, CORS, Rate Limiting

## 🛠️ Tecnologías

- **Node.js** con TypeScript
- **Express.js** framework web
- **PostgreSQL** base de datos con **pgvector**
- **Prisma** ORM
- **OpenAI** embeddings para RAG
- **AWS S3** almacenamiento de archivos
- **JWT** autenticación
- **Joi** validación
- **Multer** upload de archivos
- **Straico API** análisis de IA

## 📦 Instalación

```bash
# Instalar dependencias
npm install

# Configurar variables de entorno
cp env.example .env

# Editar .env con tus configuraciones
DATABASE_URL="postgresql://usuario:password@localhost:5432/ontrack"
JWT_SECRET="tu_jwt_secret"
STRAICO_API_KEY="tu_straico_api_key"
```

## 🗄️ Base de Datos

```bash
# Generar cliente Prisma
npm run db:generate

# Ejecutar migraciones
npm run db:push

# Poblar con datos de prueba
npm run db:seed
```

## 🚀 Desarrollo

```bash
# Iniciar servidor de desarrollo
npm run dev

# Build para producción
npm run build

# Iniciar servidor de producción
npm start
```

## 🧠 Sistema RAG (Retrieval-Augmented Generation)

### ⚡ Quick Start

```bash
# 1. Configurar OpenAI API Key
echo 'OPENAI_API_KEY="sk-proj-..."' >> .env

# 2. Setup automático (instala pgvector y configura todo)
bash scripts/setup-rag-system.sh

# 3. ¡Listo! El sistema vectorizará documentos automáticamente
```

### 📚 ¿Qué hace el sistema RAG?

El sistema RAG enriquece el análisis de clases con contexto del centro de conocimiento:

1. **Profesor sube documentos** (PDF, DOC, DOCX, TXT)
   - Sistema vectoriza automáticamente con OpenAI embeddings
   - Divide en chunks y guarda en PostgreSQL con pgvector

2. **Búsqueda semántica** 
   - Encuentra documentos por significado, no solo palabras exactas
   - Similitud coseno con threshold de 70%

3. **Análisis enriquecido**
   - Al analizar una clase, busca documentos relevantes
   - Straico compara la clase con el material del profesor
   - Detecta inconsistencias y recomienda recursos específicos

### 💰 Costos

- **OpenAI embeddings**: ~$1-5 USD/mes (uso normal)
- **PostgreSQL + pgvector**: GRATIS
- **Total**: Extremadamente económico

### 📖 Documentación

- 🚀 [Quick Start](./QUICK_START_RAG.md) - Setup en 5 minutos
- 📚 [Guía Completa](./RAG_IMPLEMENTATION_GUIDE.md) - Arquitectura y testing
- 🔧 [pgvector Setup](./PGVECTOR_SETUP.md) - Instalación detallada

### 🔌 Endpoints RAG

```bash
# Subir y vectorizar documento
POST /api/documents

# Buscar semánticamente
GET /api/documents/search?query=concepto

# Estadísticas del centro de conocimiento
GET /api/documents/stats

# Re-vectorizar documento
POST /api/documents/:id/reprocess
```

## 📊 Endpoints API

### Autenticación
- `POST /api/auth/login` - Login de usuario
- `POST /api/auth/register` - Registro de usuario
- `GET /api/auth/me` - Obtener usuario actual

### Clases
- `GET /api/classes` - Listar clases
- `POST /api/classes` - Crear clase
- `GET /api/classes/:id` - Obtener clase
- `PUT /api/classes/:id` - Actualizar clase
- `DELETE /api/classes/:id` - Eliminar clase

### Estudiantes
- `GET /api/students` - Listar estudiantes
- `POST /api/students` - Crear estudiante
- `GET /api/students/:id` - Obtener estudiante
- `PUT /api/students/:id` - Actualizar estudiante
- `DELETE /api/students/:id` - Eliminar estudiante

### Grabaciones
- `GET /api/recordings` - Listar grabaciones
- `POST /api/recordings` - Crear grabación
- `GET /api/recordings/:id` - Obtener grabación
- `PUT /api/recordings/:id` - Actualizar grabación
- `DELETE /api/recordings/:id` - Eliminar grabación

### Análisis
- `POST /api/analysis/transcript` - Analizar transcripción
- `GET /api/analysis/:id` - Obtener análisis
- `GET /api/analysis/recording/:recordingId` - Análisis por grabación

## 🔧 Configuración

### Variables de Entorno

**Básicas:**
- `DATABASE_URL`: URL de conexión a PostgreSQL
- `JWT_SECRET`: Secreto para JWT
- `JWT_EXPIRES_IN`: Tiempo de expiración del token
- `PORT`: Puerto del servidor (default: 3001)

**IA y Análisis:**
- `STRAICO_API_KEY`: API key de Straico para análisis
- `OPENAI_API_KEY`: API key de OpenAI para embeddings RAG
- `OPENAI_EMBEDDING_MODEL`: Modelo de embeddings (default: text-embedding-3-small)

**Almacenamiento:**
- `AWS_ACCESS_KEY_ID`: Credenciales AWS S3
- `AWS_SECRET_ACCESS_KEY`: Secret key AWS
- `AWS_REGION`: Región AWS (default: us-east-1)
- `S3_BUCKET_NAME`: Nombre del bucket S3

### Base de Datos

El esquema incluye:
- **Users**: Usuarios del sistema (profesores/admins)
- **Schools**: Instituciones educativas
- **Classes**: Clases
- **Students**: Estudiantes
- **Recordings**: Grabaciones de audio
- **AIAnalysis**: Análisis de IA
- **Documents**: Documentos del centro de conocimiento
- **DocumentVectors**: Vectores embeddings (pgvector)

## 🚀 Deployment

### Con PM2

```bash
# Instalar PM2 globalmente
npm install -g pm2

# Iniciar aplicación
pm2 start ecosystem.config.js

# Ver logs
pm2 logs ontrack-backend
```

### Con Docker

```bash
# Build imagen
docker build -t ontrack-backend .

# Ejecutar contenedor
docker run -p 3001:3001 ontrack-backend
```

## 📝 Licencia

MIT License