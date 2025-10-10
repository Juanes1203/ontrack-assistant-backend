# 🚀 Configuración de pgvector para PostgreSQL

Esta guía te ayudará a instalar y configurar pgvector en tu base de datos PostgreSQL.

## 📋 Prerequisitos

- PostgreSQL 12 o superior instalado
- Acceso a la base de datos como superusuario

---

## 🔧 Instalación de pgvector

### **Opción 1: macOS (Homebrew)**

```bash
# 1. Instalar pgvector
brew install pgvector

# 2. La extensión se instalará automáticamente en PostgreSQL
```

### **Opción 2: Ubuntu/Debian**

```bash
# 1. Agregar repositorio
sudo apt-get update
sudo apt-get install postgresql-server-dev-all

# 2. Clonar y compilar pgvector
cd /tmp
git clone --branch v0.7.0 https://github.com/pgvector/pgvector.git
cd pgvector
make
sudo make install

# 3. Reiniciar PostgreSQL
sudo service postgresql restart
```

### **Opción 3: Docker (si usas PostgreSQL en Docker)**

```yaml
# docker-compose.yml
version: '3.8'
services:
  postgres:
    image: ankane/pgvector:latest  # Imagen con pgvector preinstalado
    environment:
      POSTGRES_USER: ontrack_user
      POSTGRES_PASSWORD: tu_password
      POSTGRES_DB: ontrack_db
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

### **Opción 4: Servicios Cloud**

**AWS RDS:**
- PostgreSQL 15.2+ tiene pgvector preinstalado
- Solo necesitas habilitarlo (ver paso siguiente)

**Supabase:**
- pgvector viene habilitado por defecto

**Google Cloud SQL:**
- PostgreSQL 14+ soporta pgvector
- Contactar soporte para habilitar

---

## ✅ Habilitar la Extensión

### **Paso 1: Conectar a PostgreSQL**

```bash
# Conectar con psql
psql -U ontrack_user -d ontrack_db

# O usar tu cliente favorito (DBeaver, pgAdmin, etc.)
```

### **Paso 2: Ejecutar la migración**

**Opción A: Manual (desde psql)**

```sql
-- Habilitar pgvector
CREATE EXTENSION IF NOT EXISTS vector;

-- Verificar instalación
SELECT extname, extversion FROM pg_extension WHERE extname = 'vector';

-- Deberías ver:
-- extname | extversion
-- --------+-----------
-- vector  | 0.7.0
```

**Opción B: Desde el archivo de migración**

```bash
# Ejecutar el script SQL
psql -U ontrack_user -d ontrack_db -f scripts/add_pgvector_support.sql
```

### **Paso 3: Aplicar migración de Prisma**

```bash
# Actualizar Prisma para reconocer los cambios
npx prisma db push

# Regenerar cliente Prisma
npx prisma generate
```

---

## 🧪 Verificar Instalación

### **Test 1: Crear tabla de prueba**

```sql
-- Crear tabla de prueba
CREATE TABLE test_vectors (
  id SERIAL PRIMARY KEY,
  name TEXT,
  embedding vector(1536)
);

-- Insertar vector de prueba
INSERT INTO test_vectors (name, embedding) 
VALUES ('test', array_fill(0.1, ARRAY[1536])::vector);

-- Buscar por similitud
SELECT name, embedding <=> array_fill(0.1, ARRAY[1536])::vector AS distance
FROM test_vectors
ORDER BY distance
LIMIT 5;

-- Limpiar
DROP TABLE test_vectors;
```

Si todo funciona, ¡estás listo! 🎉

---

## 📊 Optimización (Opcional)

### **Índices para mejor rendimiento**

```sql
-- HNSW (recomendado para <10M vectores)
-- Pros: Muy rápido, buena precisión
-- Contras: Usa más RAM
CREATE INDEX document_vectors_embedding_hnsw_idx 
ON document_vectors 
USING hnsw (embedding vector_cosine_ops);

-- IVFFlat (recomendado para >10M vectores)
-- Pros: Menos RAM
-- Contras: Necesita tuning
CREATE INDEX document_vectors_embedding_ivfflat_idx 
ON document_vectors 
USING ivfflat (embedding vector_cosine_ops) 
WITH (lists = 100);
```

### **Configuración de PostgreSQL**

Agregar a `postgresql.conf` para mejor rendimiento:

```ini
# Para HNSW
shared_buffers = 4GB           # 25% de RAM disponible
max_connections = 100
work_mem = 50MB

# Para IVFFlat
maintenance_work_mem = 2GB     # Para construcción de índices
```

---

## 🐛 Troubleshooting

### **Error: "extension 'vector' is not available"**

```bash
# Verificar que pgvector está instalado
ls /usr/share/postgresql/*/extension/vector*

# Si no aparece nada, reinstalar pgvector (ver arriba)
```

### **Error: "operator does not exist: vector <=> vector"**

```sql
-- Verificar que la extensión está habilitada
SELECT * FROM pg_extension WHERE extname = 'vector';

-- Si no está, habilitarla
CREATE EXTENSION vector;
```

### **Error: "permission denied to create extension"**

```sql
-- Conectar como superusuario
psql -U postgres -d ontrack_db

-- Luego habilitar extensión
CREATE EXTENSION vector;
```

---

## 📚 Recursos Adicionales

- [Documentación oficial pgvector](https://github.com/pgvector/pgvector)
- [Comparación de índices](https://github.com/pgvector/pgvector#indexing)
- [Benchmarks](https://github.com/pgvector/pgvector#performance)

---

## ✅ Siguiente Paso

Una vez pgvector esté instalado y funcionando:

```bash
# 1. Configurar variable de entorno OpenAI
cp env.example .env
# Editar .env y agregar tu OPENAI_API_KEY

# 2. Ejecutar la aplicación
npm run dev

# 3. Subir un documento de prueba
# El sistema lo vectorizará automáticamente
```

¡Ya estás listo para usar RAG con OpenAI! 🚀

