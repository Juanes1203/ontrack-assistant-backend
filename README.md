# OnTrack Backend

API backend para el sistema de análisis de clases educativas con inteligencia artificial.

## 🚀 Características

- **Autenticación JWT**: Sistema de login seguro con roles
- **Base de Datos PostgreSQL**: Almacenamiento robusto con Prisma ORM
- **APIs RESTful**: Endpoints para todas las operaciones
- **Análisis con IA**: Integración con Straico API
- **Upload de Archivos**: Gestión de grabaciones de audio
- **Validación**: Validación robusta con Joi
- **Seguridad**: Middleware de seguridad con Helmet, CORS, Rate Limiting

## 🛠️ Tecnologías

- **Node.js** con TypeScript
- **Express.js** framework web
- **PostgreSQL** base de datos
- **Prisma** ORM
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

- `DATABASE_URL`: URL de conexión a PostgreSQL
- `JWT_SECRET`: Secreto para JWT
- `JWT_EXPIRES_IN`: Tiempo de expiración del token
- `STRAICO_API_KEY`: API key de Straico
- `PORT`: Puerto del servidor (default: 3001)

### Base de Datos

El esquema incluye:
- **Users**: Usuarios del sistema (profesores/admins)
- **Schools**: Instituciones educativas
- **Classes**: Clases
- **Students**: Estudiantes
- **Recordings**: Grabaciones de audio
- **AIAnalysis**: Análisis de IA

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