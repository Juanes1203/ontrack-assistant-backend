# Arquitectura Multi-Usuario - Centro de Conocimiento

## 🏗️ **Arquitectura del Sistema**

### **Estructura de Usuarios**
```
School (Escuela)
├── Admin (Administrador)
│   ├── Puede ver TODOS los documentos de la escuela
│   ├── Acceso a estadísticas completas
│   └── Gestión de usuarios
└── Teachers (Profesores)
    ├── Profesor 1
    │   ├── Solo ve SUS documentos
    │   ├── Sube documentos a su carpeta
    │   └── Estadísticas personales
    ├── Profesor 2
    │   ├── Solo ve SUS documentos
    │   ├── Sube documentos a su carpeta
    │   └── Estadísticas personales
    └── Profesor N...
```

## 📁 **Organización en S3 por Usuario**

### **Estructura de Carpetas**
```
tu-bucket-s3/
└── documents/
    ├── teacher-1-id/
    │   ├── lecturas/
    │   │   ├── uuid1.pdf
    │   │   └── uuid2.docx
    │   ├── ejercicios/
    │   │   ├── uuid3.pdf
    │   │   └── uuid4.xlsx
    │   └── recursos/
    │       └── uuid5.ppt
    ├── teacher-2-id/
    │   ├── lecturas/
    │   │   └── uuid6.pdf
    │   └── ejercicios/
    │       └── uuid7.docx
    └── teacher-n-id/
        └── general/
            └── uuid8.txt
```

## 🔐 **Sistema de Permisos**

### **Profesores (TEACHER)**
- ✅ Subir documentos a su carpeta personal
- ✅ Ver solo sus propios documentos
- ✅ Editar metadatos de sus documentos
- ✅ Eliminar sus documentos
- ✅ Descargar sus documentos
- ✅ Ver estadísticas personales
- ❌ Ver documentos de otros profesores
- ❌ Acceso a estadísticas de la escuela

### **Administradores (ADMIN)**
- ✅ Todas las funciones de profesores
- ✅ Ver TODOS los documentos de la escuela
- ✅ Ver estadísticas completas de la escuela
- ✅ Ver documentos por profesor
- ✅ Monitorear uso del sistema

## 🚀 **Endpoints por Tipo de Usuario**

### **Para Profesores**
```bash
# Documentos personales
GET    /api/documents                    # Mis documentos
POST   /api/documents                    # Subir documento
GET    /api/documents/:id                # Ver documento específico
PUT    /api/documents/:id                # Actualizar metadatos
DELETE /api/documents/:id                # Eliminar documento
GET    /api/documents/:id/download       # Descargar documento

# Búsqueda personal
GET    /api/documents/category/:category  # Por categoría
GET    /api/documents/search/tags         # Por tags
GET    /api/documents/stats               # Mis estadísticas
```

### **Para Administradores (ADMIN)**
```bash
# Todas las funciones de profesores +
GET    /api/documents/school/all          # TODOS los documentos
GET    /api/documents/school/stats       # Estadísticas completas
```

## 📊 **Ejemplo de Flujo de Trabajo**

### **1. Profesor se autentica**
```bash
POST /api/auth/login
{
  "email": "profesor1@escuela.com",
  "password": "password123"
}

Response:
{
  "token": "jwt_token_here",
  "user": {
    "id": "teacher-1-id",
    "role": "TEACHER",
    "schoolId": "school-1-id"
  }
}
```

### **2. Profesor sube documento**
```bash
POST /api/documents
Authorization: Bearer jwt_token_here
Form-data:
- file: documento.pdf
- title: "Clase de Matemáticas"
- category: "lecturas"
- tags: "matemáticas,álgebra"

# El archivo se guarda en:
# S3: documents/teacher-1-id/lecturas/uuid.pdf
# DB: Document con teacherId = "teacher-1-id"
```

### **3. Profesor ve sus documentos**
```bash
GET /api/documents
Authorization: Bearer jwt_token_here

# Solo retorna documentos donde teacherId = "teacher-1-id"
```

### **4. Administrador ve todos los documentos**
```bash
GET /api/documents/school/all
Authorization: Bearer admin_token_here

# Retorna TODOS los documentos de la escuela
# Incluye información del profesor que los subió
```

## 🔒 **Seguridad Implementada**

### **Aislamiento de Datos**
- Cada profesor solo puede acceder a sus documentos
- Filtrado automático por `teacherId` en todas las consultas
- Verificación de permisos por rol de usuario

### **Autenticación**
- JWT tokens con información de usuario y rol
- Middleware de autenticación en todas las rutas
- Verificación de permisos específicos para funciones de admin

### **Almacenamiento Seguro**
- URLs firmadas con expiración temporal
- Organización por usuario en S3
- Eliminación segura de archivos

## 📈 **Estadísticas Disponibles**

### **Para Profesores**
```json
{
  "totalDocuments": 15,
  "documentsByStatus": [
    {"status": "READY", "count": 12},
    {"status": "PROCESSING", "count": 2},
    {"status": "ERROR", "count": 1}
  ],
  "documentsByCategory": [
    {"category": "lecturas", "count": 8},
    {"category": "ejercicios", "count": 5},
    {"category": "recursos", "count": 2}
  ],
  "totalSize": 52428800
}
```

### **Para Administradores**
```json
{
  "totalDocuments": 150,
  "totalTeachers": 10,
  "documentsByTeacher": [
    {
      "teacherId": "teacher-1-id",
      "teacherName": "Juan Pérez",
      "teacherEmail": "juan@escuela.com",
      "documentCount": 15
    }
  ],
  "documentsByCategory": [...],
  "documentsByStatus": [...],
  "totalSize": 524288000
}
```

## 🎯 **Beneficios de esta Arquitectura**

### **Para Profesores**
- ✅ Privacidad total de sus documentos
- ✅ Organización automática por categorías
- ✅ Búsqueda fácil de sus materiales
- ✅ Estadísticas personales de uso

### **Para Administradores**
- ✅ Visión completa del centro de conocimiento
- ✅ Monitoreo de uso por profesor
- ✅ Estadísticas agregadas de la escuela
- ✅ Gestión centralizada del sistema

### **Para la Escuela**
- ✅ Escalabilidad (múltiples profesores)
- ✅ Seguridad (aislamiento de datos)
- ✅ Organización (estructura clara)
- ✅ Monitoreo (estadísticas detalladas)

## 🚀 **Próximos Pasos Sugeridos**

1. **Compartir Documentos**: Permitir que profesores compartan documentos entre ellos
2. **Colaboración**: Sistema de comentarios y anotaciones
3. **Versionado**: Control de versiones de documentos
4. **Notificaciones**: Alertas cuando se suben nuevos documentos
5. **Búsqueda Global**: Búsqueda en todos los documentos de la escuela (con permisos)

---

**¡El sistema está diseñado para escalar con múltiples profesores manteniendo la seguridad y organización! 🎓📚**
