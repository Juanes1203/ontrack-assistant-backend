# 🚀 Deployment en Ubuntu - Sistema RAG

Guía para desplegar el sistema RAG con OpenAI + pgvector en el servidor Ubuntu.

---

## 📋 Pre-requisitos en Ubuntu

- ✅ Ubuntu 20.04+ 
- ✅ Node.js 16+ instalado
- ✅ PostgreSQL 12+ instalado
- ✅ Git configurado
- ✅ PM2 para procesos (opcional)

---

## 🔧 Paso 1: Pull del Código

```bash
# En el servidor Ubuntu
cd /ruta/a/tu/proyecto
git pull origin main

# Instalar dependencias
npm install
```

---

## 🔑 Paso 2: Configurar Variables de Entorno

```bash
# Copiar ejemplo
cp env.example .env

# Editar .env con las credenciales REALES del servidor
nano .env
```

### **Variables críticas a configurar:**

```env
# PostgreSQL (usar credenciales reales de Ubuntu)
DATABASE_URL="postgresql://TU_USUARIO:TU_PASSWORD@localhost:5432/TU_DATABASE"

# OpenAI (usa tu API key de OpenAI)
OPENAI_API_KEY="sk-proj-TU_API_KEY_DE_OPENAI_AQUI"
OPENAI_EMBEDDING_MODEL="text-embedding-3-small"
OPENAI_MAX_TOKENS="8191"

# Straico (si tienes)
STRAICO_API_KEY="tu_straico_api_key"

# AWS S3 (credenciales reales)
AWS_ACCESS_KEY_ID="tu_access_key"
AWS_SECRET_ACCESS_KEY="tu_secret_key"
AWS_REGION="us-east-1"
S3_BUCKET_NAME="tu_bucket"
S3_DOCUMENTS_PREFIX="documents/"

# Otros
PORT="3001"
NODE_ENV="production"
JWT_SECRET="tu_jwt_secret_seguro"
JWT_EXPIRES_IN="7d"
```

---

## 🐘 Paso 3: Instalar pgvector en PostgreSQL

### **Opción A: Usar el script automatizado** ⭐

```bash
# Ejecutar script de setup
bash scripts/setup-rag-system.sh
```

El script hará:
1. ✅ Instalar pgvector en PostgreSQL
2. ✅ Crear extensión vector
3. ✅ Aplicar migraciones de Prisma
4. ✅ Crear índices optimizados
5. ✅ Verificar instalación

### **Opción B: Manual (si el script falla)**

```bash
# 1. Instalar pgvector
sudo apt-get update
sudo apt-get install postgresql-server-dev-all

cd /tmp
git clone --branch v0.7.0 https://github.com/pgvector/pgvector.git
cd pgvector
make
sudo make install

# 2. Reiniciar PostgreSQL
sudo service postgresql restart

# 3. Ejecutar migración SQL
psql -d tu_database -f scripts/add_pgvector_support.sql

# Si te pide usuario:
psql -U tu_usuario -d tu_database -f scripts/add_pgvector_support.sql

# 4. Aplicar migraciones de Prisma
npx prisma db push
npx prisma generate
```

---

## ✅ Paso 4: Verificar Instalación

```bash
# Verificar que pgvector está instalado
psql -d tu_database -c "SELECT extversion FROM pg_extension WHERE extname = 'vector';"

# Debería mostrar:
#  extversion
# ------------
#  0.7.0

# Verificar tablas
psql -d tu_database -c "\dt"

# Deberías ver:
# - documents
# - document_vectors
# - users
# - classes
# - etc.
```

---

## 🚀 Paso 5: Iniciar la Aplicación

### **Con PM2 (Recomendado)**

```bash
# Build de producción
npm run build

# Iniciar con PM2
pm2 start ecosystem.config.js

# Ver logs
pm2 logs ontrack-backend

# Guardar configuración
pm2 save
```

### **Sin PM2 (Modo desarrollo)**

```bash
# Modo desarrollo
npm run dev

# O modo producción
npm run build
npm start
```

---

## 🧪 Paso 6: Probar el Sistema RAG

### **Test 1: Verificar servidor**

```bash
curl http://localhost:3001/api/health
# O la URL de tu servidor
```

### **Test 2: Subir documento**

```bash
# Obtener token JWT primero
TOKEN=$(curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"tu_email","password":"tu_password"}' \
  | jq -r '.data.token')

# Subir documento de prueba
curl -X POST http://localhost:3001/api/documents \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@test.pdf" \
  -F "title=Test Document" \
  -F "category=test"
```

### **Test 3: Verificar vectorización**

Verás en los logs de PM2:
```bash
pm2 logs ontrack-backend --lines 50

# Deberías ver:
# 🚀 Procesando documento...
# 📄 Texto extraído: X caracteres
# 🤖 Vectorizando X chunks con OpenAI...
# ✅ Chunk 1/X vectorizado
# ...
# 🎉 Documento procesado y vectorizado exitosamente
```

### **Test 4: Búsqueda semántica**

```bash
curl "http://localhost:3001/api/documents/search?query=concepto&limit=5" \
  -H "Authorization: Bearer $TOKEN"
```

### **Test 5: Stats**

```bash
curl "http://localhost:3001/api/documents/stats" \
  -H "Authorization: Bearer $TOKEN"
```

---

## 🐛 Troubleshooting en Ubuntu

### **Error: "pgvector extension not found"**

```bash
# Verificar que PostgreSQL tenga los headers
sudo apt-get install postgresql-server-dev-all

# Reinstalar pgvector
cd /tmp/pgvector
sudo make install
sudo service postgresql restart

# Crear extensión manualmente
psql -d tu_database -c "CREATE EXTENSION vector;"
```

### **Error: "OpenAI API key invalid"**

```bash
# Verificar en .env
grep OPENAI_API_KEY .env

# Debe mostrar:
# OPENAI_API_KEY="sk-proj-..."

# Reiniciar aplicación
pm2 restart ontrack-backend
```

### **Error: "Cannot connect to PostgreSQL"**

```bash
# Verificar que PostgreSQL esté corriendo
sudo service postgresql status

# Iniciar si no está corriendo
sudo service postgresql start

# Verificar conexión
psql -U tu_usuario -d tu_database -c "SELECT 1;"

# Verificar DATABASE_URL en .env
grep DATABASE_URL .env
```

### **Error: "Documents stuck in PROCESSING"**

```bash
# Ver logs en detalle
pm2 logs ontrack-backend --err --lines 100

# Verificar que OpenAI responde
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer $OPENAI_API_KEY"

# Si falla OpenAI:
# - Verificar créditos en OpenAI dashboard
# - Verificar API key
# - Verificar firewall/proxy del servidor
```

### **Error: "Out of memory" o crash**

```bash
# Aumentar memoria de Node.js
NODE_OPTIONS="--max-old-space-size=4096" npm start

# O en PM2:
# Editar ecosystem.config.js:
node_args: "--max-old-space-size=4096"

pm2 restart ontrack-backend
```

---

## 🔒 Seguridad en Producción

### **1. Variables de Entorno**

```bash
# Nunca commitear .env
echo ".env" >> .gitignore

# Permisos restrictivos
chmod 600 .env
```

### **2. PostgreSQL**

```bash
# Configurar firewall (solo local)
sudo ufw allow from 127.0.0.1 to any port 5432

# Deshabilitar acceso externo a PostgreSQL
sudo nano /etc/postgresql/*/main/pg_hba.conf
# Asegurar: local all all peer
```

### **3. HTTPS/SSL**

Si usas nginx como proxy:
```nginx
server {
    listen 443 ssl;
    server_name tu-dominio.com;

    ssl_certificate /ruta/a/cert.pem;
    ssl_certificate_key /ruta/a/key.pem;

    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

---

## 📊 Monitoreo

### **Logs de aplicación**

```bash
# Ver logs en tiempo real
pm2 logs ontrack-backend

# Logs de errores
pm2 logs ontrack-backend --err

# Logs históricos
pm2 logs ontrack-backend --lines 1000
```

### **Métricas de uso**

```bash
# Uso de OpenAI (ver en dashboard)
# https://platform.openai.com/usage

# Uso de PostgreSQL
psql -d tu_database -c "
  SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
  FROM pg_tables
  WHERE schemaname = 'public'
  ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
"
```

### **Health check**

Agregar endpoint de health (si no existe):
```typescript
// En tu app
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    services: {
      database: 'connected', // verificar prisma
      openai: 'configured',
      pgvector: 'installed'
    }
  });
});
```

---

## 🔄 Actualización del Sistema

```bash
# 1. Pull de cambios
git pull origin main

# 2. Instalar nuevas dependencias
npm install

# 3. Aplicar migraciones (si hay)
npx prisma db push
npx prisma generate

# 4. Build
npm run build

# 5. Reiniciar
pm2 restart ontrack-backend

# 6. Verificar
pm2 logs ontrack-backend --lines 20
```

---

## ✅ Checklist de Deployment

- [ ] Pull del código actualizado
- [ ] Configurar `.env` con credenciales reales
- [ ] Instalar pgvector en PostgreSQL
- [ ] Ejecutar migración SQL
- [ ] Aplicar migraciones de Prisma
- [ ] Verificar extensión pgvector instalada
- [ ] Build de producción
- [ ] Iniciar con PM2
- [ ] Probar subida de documento
- [ ] Verificar vectorización en logs
- [ ] Probar búsqueda semántica
- [ ] Verificar análisis con RAG
- [ ] Configurar monitoring
- [ ] Configurar backups de BD

---

## 📚 Recursos

- [Guía Completa RAG](./RAG_IMPLEMENTATION_GUIDE.md)
- [Quick Start](./QUICK_START_RAG.md)
- [Setup pgvector](./PGVECTOR_SETUP.md)
- [Resumen Implementación](./RESUMEN_IMPLEMENTACION_RAG.md)

---

## 💡 Tips para Ubuntu

1. **Usa tmux o screen** para procesos que no sean PM2
2. **Configura logrotate** para logs de PM2
3. **Backups automáticos** de PostgreSQL con cron
4. **Monitorea espacio** en disco (vectores ocupan espacio)
5. **Configura alertas** para errores críticos

---

¡Sistema RAG listo para producción en Ubuntu! 🚀

