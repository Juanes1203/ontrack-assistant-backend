# Centro de Conocimiento - Guía de Documentos con AWS S3

## Configuración Inicial

### 1. Variables de Entorno

Asegúrate de configurar las siguientes variables en tu archivo `.env`:

```env
# AWS S3 Configuration
AWS_ACCESS_KEY_ID="tu_access_key_id_aqui"
AWS_SECRET_ACCESS_KEY="tu_secret_access_key_aqui"
AWS_REGION="us-east-1"
S3_BUCKET_NAME="tu_bucket_name_aqui"
S3_DOCUMENTS_PREFIX="documents/"
```

### 2. Configuración del Bucket S3

1. Crea un bucket en AWS S3
2. Configura las políticas de acceso necesarias
3. Asegúrate de que tu usuario IAM tenga permisos para:
   - `s3:PutObject`
   - `s3:GetObject`
   - `s3:DeleteObject`
   - `s3:ListBucket`

## Endpoints Disponibles

### 1. Subir Documento
**POST** `/api/documents`

**Headers:**
- `Authorization: Bearer <token>`
- `Content-Type: multipart/form-data`

**Body (form-data):**
- `file`: Archivo a subir (requerido)
- `title`: Título del documento (requerido)
- `description`: Descripción del documento (opcional)
- `category`: Categoría del documento (opcional)
- `tags`: Tags separados por comas (opcional)

**Tipos de archivo permitidos:**
- PDF (.pdf)
- Word (.doc, .docx)
- PowerPoint (.ppt, .pptx)
- Excel (.xls, .xlsx)
- Texto (.txt, .md)

**Ejemplo:**
```bash
curl -X POST http://localhost:3001/api/documents \
  -H "Authorization: Bearer <token>" \
  -F "file=@documento.pdf" \
  -F "title=Mi Documento" \
  -F "description=Descripción del documento" \
  -F "category=lecturas" \
  -F "tags=matemáticas,álgebra,ejercicios"
```

### 2. Obtener Todos los Documentos
**GET** `/api/documents`

**Headers:**
- `Authorization: Bearer <token>`

**Respuesta:**
```json
{
  "success": true,
  "data": [
    {
      "id": "doc_id",
      "title": "Mi Documento",
      "description": "Descripción",
      "filename": "generated_filename.pdf",
      "originalName": "documento.pdf",
      "fileType": "PDF",
      "fileSize": 1024000,
      "s3Key": "documents/lecturas/uuid.pdf",
      "s3Url": "https://signed-url...",
      "category": "lecturas",
      "tags": ["matemáticas", "álgebra"],
      "status": "READY",
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

### 3. Obtener Documento por ID
**GET** `/api/documents/:id`

### 4. Descargar Documento
**GET** `/api/documents/:id/download`

**Respuesta:**
```json
{
  "success": true,
  "data": {
    "downloadUrl": "https://signed-url-for-download",
    "filename": "documento.pdf",
    "expiresIn": 3600
  }
}
```

### 5. Eliminar Documento
**DELETE** `/api/documents/:id`

### 6. Actualizar Metadatos
**PUT** `/api/documents/:id`

**Body:**
```json
{
  "title": "Nuevo Título",
  "description": "Nueva descripción",
  "category": "nueva_categoria",
  "tags": "tag1,tag2,tag3"
}
```

### 7. Buscar por Categoría
**GET** `/api/documents/category/:category`

### 8. Buscar por Tags
**GET** `/api/documents/search/tags?tags=tag1,tag2`

### 9. Estadísticas
**GET** `/api/documents/stats`

**Respuesta:**
```json
{
  "success": true,
  "data": {
    "totalDocuments": 25,
    "documentsByStatus": [
      { "status": "READY", "count": 20 },
      { "status": "PROCESSING", "count": 3 },
      { "status": "ERROR", "count": 2 }
    ],
    "documentsByCategory": [
      { "category": "lecturas", "count": 10 },
      { "category": "ejercicios", "count": 8 },
      { "category": "recursos", "count": 7 }
    ],
    "totalSize": 52428800
  }
}
```

## Estructura de Archivos en S3

Los archivos se organizan en S3 con la siguiente estructura:

```
bucket-name/
└── documents/
    ├── lecturas/
    │   ├── uuid1.pdf
    │   └── uuid2.docx
    ├── ejercicios/
    │   ├── uuid3.pdf
    │   └── uuid4.xlsx
    └── recursos/
        ├── uuid5.ppt
        └── uuid6.txt
```

## Características del Sistema

### 1. Seguridad
- URLs firmadas con expiración (1 hora por defecto)
- Autenticación requerida para todas las operaciones
- Validación de tipos de archivo
- Límites de tamaño de archivo

### 2. Organización
- Categorización automática por carpeta
- Sistema de tags para búsqueda avanzada
- Metadatos completos de cada documento

### 3. Escalabilidad
- Almacenamiento en AWS S3 (escalable)
- Procesamiento asíncrono de documentos
- URLs temporales para descarga

### 4. Monitoreo
- Estados de procesamiento (PROCESSING, READY, ERROR)
- Estadísticas detalladas
- Logs de errores

## Migración de Base de Datos

Si ya tienes documentos existentes, ejecuta la migración:

```bash
npx prisma db push
```

## Troubleshooting

### Error: "Failed to upload document to S3"
- Verifica las credenciales de AWS
- Confirma que el bucket existe
- Revisa los permisos IAM

### Error: "Tipo de archivo no permitido"
- Verifica que el archivo sea de un tipo soportado
- Revisa la extensión del archivo

### Error: "File too large"
- Verifica el límite de tamaño en `MAX_FILE_SIZE`
- El límite por defecto es 10MB

## Próximos Pasos

1. **Procesamiento de Contenido**: Implementar extracción de texto de PDFs y documentos
2. **Búsqueda Full-Text**: Integrar Elasticsearch para búsqueda en el contenido
3. **IA para Clasificación**: Usar IA para categorizar automáticamente documentos
4. **Versionado**: Implementar versionado de documentos
5. **Colaboración**: Permitir comentarios y anotaciones en documentos
