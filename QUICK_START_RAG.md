# 🚀 Quick Start - Sistema RAG

Guía rápida para poner en marcha el sistema RAG en **5 minutos**.

## 📋 Pre-requisitos

- ✅ Node.js 16+ instalado
- ✅ PostgreSQL 12+ instalado
- ✅ Cuenta de OpenAI con créditos

---

## ⚡ Setup Rápido (5 minutos)

### **1. Clonar y configurar** (1 min)

```bash
cd /Users/juanes/Documents/OnTrack/OnTrack_Backend

# Instalar dependencias
npm install
```

### **2. Obtener API Key de OpenAI** (2 min)

```bash
# 1. Ir a: https://platform.openai.com/api-keys
# 2. Crear nueva API key
# 3. Copiar (empieza con sk-proj-...)
# 4. Agregar $5 USD de crédito (suficiente por meses)
```

### **3. Configurar .env** (1 min)

```bash
# Copiar ejemplo
cp env.example .env

# Editar .env
nano .env
```

Agregar:
```env
OPENAI_API_KEY="sk-proj-TU_KEY_AQUI"
DATABASE_URL="postgresql://user:password@localhost:5432/ontrack_db"
```

### **4. Setup Automático** (1 min)

```bash
# Ejecutar script de setup
bash scripts/setup-rag-system.sh
```

Esto hace:
- ✅ Instala pgvector en PostgreSQL
- ✅ Aplica migraciones
- ✅ Verifica configuración
- ✅ Crea directorios necesarios

---

## 🎯 Probar el Sistema

### **1. Iniciar servidor**

```bash
npm run dev
```

Deberías ver:
```
🤖 VectorizationService inicializado con OpenAI
🔍 RAGService inicializado con OpenAI + pgvector
✅ Server running on port 3001
```

### **2. Subir documento de prueba**

```bash
curl -X POST http://localhost:3001/api/documents \
  -H "Authorization: Bearer YOUR_JWT" \
  -F "file=@test.pdf" \
  -F "title=Test Document" \
  -F "category=test"
```

### **3. Verificar vectorización**

```bash
# Ver logs en consola:
# ✅ Chunk 1/15 vectorizado
# ✅ Chunk 2/15 vectorizado
# ...
# 🎉 Documento procesado y vectorizado exitosamente

# Verificar en BD
curl http://localhost:3001/api/documents/stats \
  -H "Authorization: Bearer YOUR_JWT"
```

### **4. Probar búsqueda semántica**

```bash
curl "http://localhost:3001/api/documents/search?query=tu%20concepto&limit=5" \
  -H "Authorization: Bearer YOUR_JWT"
```

### **5. Analizar clase con RAG**

```bash
curl -X POST http://localhost:3001/api/analysis/transcript \
  -H "Authorization: Bearer YOUR_JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "transcript": "Hoy explicamos conceptos importantes...",
    "classId": "tu_class_id"
  }'
```

---

## 📊 Verificar Funcionamiento

### **Checklist:**

- [ ] Servidor inicia sin errores
- [ ] Logs muestran "VectorizationService inicializado con OpenAI"
- [ ] Documento se sube correctamente
- [ ] Estado cambia a VECTORIZED
- [ ] Búsqueda retorna resultados con similarity > 0.7
- [ ] Análisis incluye contexto RAG en logs

---

## 🐛 Problemas Comunes

### **"extension 'vector' does not exist"**
```bash
# Instalar pgvector
brew install pgvector  # macOS

# O ejecutar migración manualmente
psql -d ontrack_db -f scripts/add_pgvector_support.sql
```

### **"OpenAI API key invalid"**
```bash
# Verificar en .env
grep OPENAI_API_KEY .env

# Debe empezar con: sk-proj- o sk-
```

### **"Insufficient credits"**
```bash
# Agregar créditos en:
# https://platform.openai.com/account/billing
```

### **Documento queda en PROCESSING**
```bash
# Ver errores en logs del servidor
# Verificar OpenAI API key
# Verificar pgvector instalado
```

---

## 📚 Documentación Completa

- 📖 **Guía Completa**: `RAG_IMPLEMENTATION_GUIDE.md`
- 🔧 **Setup pgvector**: `PGVECTOR_SETUP.md`
- 🏗️ **Arquitectura**: `RAG_SYSTEM_GUIDE.md`

---

## 💰 Costos Esperados

Para uso normal:
- **$0.50 - $2 USD/mes** con OpenAI
- Completamente GRATIS el almacenamiento (PostgreSQL)

---

## ✅ Siguiente Paso

**¡Ya estás listo!** 🎉

1. Sube tus documentos reales
2. Graba/analiza clases
3. Disfruta del análisis enriquecido con contexto

**Soporte:** Ver documentación o logs del servidor para debugging.

