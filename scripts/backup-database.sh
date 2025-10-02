#!/bin/bash

# Script para hacer backup de la base de datos antes de actualizaciones
# Uso: ./scripts/backup-database.sh

set -e

# Configuración
BACKUP_DIR="/var/www/ontrack/backups/database"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="database_backup_${TIMESTAMP}.sql"

# Crear directorio de backup si no existe
mkdir -p "$BACKUP_DIR"

echo "🗄️  Creando backup de la base de datos..."

# Hacer backup de la base de datos PostgreSQL
if command -v pg_dump &> /dev/null; then
    # Obtener la URL de la base de datos desde el archivo .env
    if [ -f "/var/www/ontrack/backend/.env" ]; then
        source /var/www/ontrack/backend/.env
        pg_dump "$DATABASE_URL" > "$BACKUP_DIR/$BACKUP_FILE"
        echo "✅ Backup creado: $BACKUP_DIR/$BACKUP_FILE"
    else
        echo "❌ No se encontró el archivo .env"
        exit 1
    fi
else
    echo "❌ pg_dump no está instalado"
    exit 1
fi

# Mantener solo los últimos 10 backups
cd "$BACKUP_DIR"
ls -t database_backup_*.sql | tail -n +11 | xargs -r rm
echo "🧹 Limpieza de backups antiguos completada"

echo "🎉 Backup de base de datos completado exitosamente"
