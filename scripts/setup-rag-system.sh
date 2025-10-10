#!/bin/bash

# Script de configuración del sistema RAG con OpenAI + pgvector
# Ejecutar: bash scripts/setup-rag-system.sh

set -e  # Salir si hay algún error

echo "🚀 Configuración del Sistema RAG con OpenAI + pgvector"
echo "======================================================="
echo ""

# Colores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 1. Verificar Node.js
echo "📦 Verificando Node.js..."
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js no está instalado${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Node.js $(node --version)${NC}"
echo ""

# 2. Verificar PostgreSQL
echo "🐘 Verificando PostgreSQL..."
if ! command -v psql &> /dev/null; then
    echo -e "${RED}❌ PostgreSQL no está instalado${NC}"
    exit 1
fi
echo -e "${GREEN}✅ PostgreSQL instalado${NC}"
echo ""

# 3. Verificar archivo .env
echo "🔐 Verificando configuración..."
if [ ! -f .env ]; then
    echo -e "${YELLOW}⚠️  Archivo .env no encontrado. Creando desde env.example...${NC}"
    cp env.example .env
    echo -e "${RED}⚠️  POR FAVOR edita el archivo .env y agrega:${NC}"
    echo "   - OPENAI_API_KEY"
    echo "   - DATABASE_URL"
    echo ""
    echo "Luego ejecuta este script nuevamente."
    exit 1
fi

# Verificar que OPENAI_API_KEY esté configurado
if ! grep -q "OPENAI_API_KEY=\"sk-" .env; then
    echo -e "${RED}❌ OPENAI_API_KEY no está configurado en .env${NC}"
    echo "   Por favor agrega tu API key de OpenAI y ejecuta nuevamente."
    exit 1
fi
echo -e "${GREEN}✅ Variables de entorno configuradas${NC}"
echo ""

# 4. Instalar dependencias
echo "📚 Instalando dependencias de npm..."
npm install
echo -e "${GREEN}✅ Dependencias instaladas${NC}"
echo ""

# 5. Configurar pgvector en PostgreSQL
echo "🔧 Configurando pgvector en PostgreSQL..."
echo "Se te pedirá la contraseña de PostgreSQL..."
echo ""

# Extraer DATABASE_URL del .env
DATABASE_URL=$(grep DATABASE_URL .env | cut -d '=' -f2- | tr -d '"')

if [ -z "$DATABASE_URL" ]; then
    echo -e "${RED}❌ DATABASE_URL no encontrado en .env${NC}"
    exit 1
fi

# Ejecutar migración SQL
echo "Ejecutando migración SQL..."
psql "$DATABASE_URL" -f scripts/add_pgvector_support.sql

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ pgvector instalado y configurado${NC}"
else
    echo -e "${RED}❌ Error configurando pgvector${NC}"
    echo "   Verifica que tengas permisos de superusuario en PostgreSQL"
    echo "   O ejecuta manualmente: psql -d tu_base_de_datos -f prisma/migrations/add_pgvector_support.sql"
    exit 1
fi
echo ""

# 6. Aplicar migraciones de Prisma
echo "🗄️  Aplicando migraciones de Prisma..."
npx prisma db push
npx prisma generate
echo -e "${GREEN}✅ Migraciones aplicadas${NC}"
echo ""

# 7. Crear directorio temp
echo "📁 Creando directorios necesarios..."
mkdir -p temp
echo -e "${GREEN}✅ Directorios creados${NC}"
echo ""

# 8. Verificación final
echo "🧪 Verificando instalación..."
echo ""

# Verificar extensión pgvector
PGVECTOR_CHECK=$(psql "$DATABASE_URL" -t -c "SELECT extversion FROM pg_extension WHERE extname = 'vector';" | xargs)

if [ -z "$PGVECTOR_CHECK" ]; then
    echo -e "${RED}❌ pgvector no está instalado correctamente${NC}"
    exit 1
else
    echo -e "${GREEN}✅ pgvector versión: $PGVECTOR_CHECK${NC}"
fi

# Verificar tablas
echo "Verificando tablas..."
TABLES_CHECK=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_name IN ('documents', 'document_vectors');" | xargs)

if [ "$TABLES_CHECK" -eq "2" ]; then
    echo -e "${GREEN}✅ Tablas creadas correctamente${NC}"
else
    echo -e "${YELLOW}⚠️  Algunas tablas faltan (esperadas: 2, encontradas: $TABLES_CHECK)${NC}"
fi

echo ""
echo "════════════════════════════════════════════════════"
echo -e "${GREEN}🎉 ¡Sistema RAG configurado exitosamente!${NC}"
echo "════════════════════════════════════════════════════"
echo ""
echo "📝 Próximos pasos:"
echo ""
echo "1. Inicia el servidor:"
echo "   npm run dev"
echo ""
echo "2. Sube un documento de prueba:"
echo "   POST /api/documents"
echo "   - Archivo: tu_documento.pdf"
echo "   - El sistema lo vectorizará automáticamente"
echo ""
echo "3. Verifica la vectorización:"
echo "   GET /api/documents/stats"
echo ""
echo "4. Prueba la búsqueda semántica:"
echo "   GET /api/documents/search?query=tu_consulta"
echo ""
echo "5. Analiza una clase con RAG:"
echo "   POST /api/analysis/transcript"
echo "   - El análisis incluirá contexto de tus documentos"
echo ""
echo "📚 Documentación completa en:"
echo "   - PGVECTOR_SETUP.md"
echo "   - RAG_IMPLEMENTATION_GUIDE.md"
echo ""

