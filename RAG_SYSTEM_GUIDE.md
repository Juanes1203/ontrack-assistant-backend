# 🧠 Sistema RAG (Retrieval-Augmented Generation) - OnTrack

## 📋 Resumen

El sistema RAG integra el centro de conocimiento vectorizado con el análisis de grabaciones de clases, proporcionando contexto inteligente para análisis más precisos y personalizados.

## 🏗️ Arquitectura

### Componentes Principales

1. **VectorizationService** - Procesa y vectoriza documentos
2. **RAGService** - Búsqueda semántica y generación de contexto
3. **DocumentController** - Gestión de documentos
4. **AnalysisController** - Análisis enriquecido con RAG

### Flujo de Datos

```
Documento PDF/DOC → Extracción de texto → Chunking → Vectorización → Almacenamiento en BD
                                                                    ↓
Grabación de clase → Transcripción → Búsqueda semántica → Contexto RAG → Análisis con Straico
```

## 🚀 Configuración

### Variables de Entorno Requeridas

```env
# OpenAI para embeddings
OPENAI_API_KEY="tu_openai_api_key"

# AWS S3 para almacenamiento
AWS_ACCESS_KEY_ID="tu_aws_access_key"
AWS_SECRET_ACCESS_KEY="tu_aws_secret_key"
AWS_REGION="us-east-1"
S3_BUCKET_NAME="tu_bucket_name"
S3_DOCUMENTS_PREFIX="documents/"

# Straico para análisis
STRAICO_API_KEY="tu_straico_api_key"
```

### Migración de Base de Datos

```bash
npx prisma db push
```

## 📚 API Endpoints

### Gestión de Documentos

#### Subir Documento
```http
POST /api/documents/upload
Content-Type: multipart/form-data

{
  "title": "Guía de Matemáticas",
  "description": "Conceptos básicos de álgebra",
  "category": "matematicas",
  "tags": "algebra,conceptos,basico"
}
```

#### Listar Documentos
```http
GET /api/documents?page=1&limit=10&category=matematicas&status=VECTORIZED
```

#### Buscar Documentos
```http
GET /api/documents/search?query=derivadas&category=matematicas&limit=5
```

#### Obtener Documentos Similares
```http
POST /api/documents/similar
{
  "transcript": "Hoy vamos a estudiar las derivadas...",
  "limit": 5
}
```

#### Estadísticas del Centro de Conocimiento
```http
GET /api/documents/stats
```

### Análisis con RAG

El análisis de grabaciones ahora incluye automáticamente contexto del centro de conocimiento:

```http
POST /api/analysis/transcript
{
  "transcript": "Transcripción de la clase...",
  "classId": "class_id"
}
```

## 🔧 Funcionamiento Interno

### 1. Procesamiento de Documentos

```typescript
// Cuando se sube un documento:
1. Se guarda en S3
2. Se extrae el texto (PDF/DOC/DOCX)
3. Se divide en chunks de 1000 caracteres
4. Se generan embeddings con OpenAI
5. Se almacenan vectores en la base de datos
6. Estado cambia a "VECTORIZED"
```

### 2. Búsqueda Semántica

```typescript
// Durante el análisis:
1. Se extraen palabras clave del transcript
2. Se genera embedding de la consulta
3. Se calcula similitud coseno con todos los chunks
4. Se filtran resultados por relevancia (threshold: 0.7)
5. Se ordenan por similitud descendente
```

### 3. Generación de Contexto

```typescript
// Contexto RAG generado:
- Chunks relevantes con sus documentos
- Puntuación de relevancia
- Metadatos de los documentos
- Texto estructurado para el prompt de Straico
```

## 📊 Modelos de Base de Datos

### Document
```prisma
model Document {
  id          String   @id @default(cuid())
  title       String
  description String?
  filename    String
  originalName String
  fileType    String
  fileSize    Int
  s3Key       String
  s3Url       String?
  content     String?
  chunks      String?  // JSON de chunks procesados
  category    String?
  tags        String?  // JSON array de tags
  status      String   @default("PROCESSING") // PROCESSING, READY, ERROR, VECTORIZED
  teacherId   String
  schoolId    String
  vectors     DocumentVector[]
}
```

### DocumentVector
```prisma
model DocumentVector {
  id          String   @id @default(cuid())
  documentId  String
  chunkIndex  Int
  chunkText   String
  vector      String   // JSON del vector embedding
  metadata    String?  // JSON de metadatos
  document    Document @relation(fields: [documentId], references: [id])
}
```

## 🎯 Casos de Uso

### 1. Profesor Sube Material
- Sube "Guía de Física Cuántica.pdf"
- Sistema lo procesa automáticamente
- Se vectoriza y queda disponible para búsqueda

### 2. Análisis de Clase
- Profesor graba clase sobre "Principio de Incertidumbre"
- Sistema busca chunks relevantes en sus documentos
- Straico analiza la clase CON el contexto de la guía
- Análisis incluye referencias específicas a los materiales

### 3. Búsqueda Inteligente
- Profesor busca "ondas electromagnéticas"
- Sistema encuentra chunks relevantes de múltiples documentos
- Resultados ordenados por relevancia semántica

## 🔍 Ejemplo de Análisis Enriquecido

### Sin RAG:
```
"El profesor explica conceptos de física de manera clara..."
```

### Con RAG:
```
"El profesor explica conceptos de física de manera clara, haciendo referencia 
correcta a los principios de la página 23 de su 'Guía de Física Cuántica' 
donde se define el principio de incertidumbre. La explicación es consistente 
con los ejemplos prácticos presentados en su material de apoyo..."
```

## 🚨 Consideraciones Importantes

### Límites y Configuración
- **Chunk size**: 1000 caracteres
- **Chunk overlap**: 200 caracteres
- **Similarity threshold**: 0.7
- **Max results**: 10 chunks por búsqueda
- **File size limit**: 50MB por documento

### Rendimiento
- La vectorización es asíncrona
- Los documentos se procesan en background
- La búsqueda es rápida (índices en base de datos)
- Los embeddings se cachean

### Seguridad
- Cada profesor solo accede a sus documentos
- Los admins pueden ver todos los documentos
- Los vectores se almacenan de forma segura

## 🛠️ Mantenimiento

### Re-procesar Documento
```http
POST /api/documents/{id}/reprocess
```

### Eliminar Documento
```http
DELETE /api/documents/{id}
```

### Verificar Estado
```http
GET /api/documents/{id}
```

## 📈 Métricas y Monitoreo

### Estadísticas Disponibles
- Total de documentos
- Documentos vectorizados
- Total de chunks
- Distribución por categorías
- Documentos por profesor/escuela

### Logs Importantes
- Procesamiento de documentos
- Búsquedas semánticas
- Generación de contexto RAG
- Errores de vectorización

## 🔮 Próximas Mejoras

1. **Caché de embeddings** para búsquedas más rápidas
2. **Clustering de documentos** para mejor organización
3. **Análisis de tendencias** en el centro de conocimiento
4. **Recomendaciones automáticas** de documentos
5. **Integración con más formatos** (PowerPoint, Excel, etc.)

---

## 🎉 ¡Sistema RAG Completamente Funcional!

El sistema está listo para proporcionar análisis de clases más inteligentes y contextualizados, aprovechando todo el conocimiento acumulado en el centro de documentos de cada profesor.
