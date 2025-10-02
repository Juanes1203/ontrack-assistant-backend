#!/bin/bash

# Script de actualización segura que incluye backup de base de datos
# Uso: ./scripts/safe-update.sh

set -e

echo "🚀 Iniciando actualización segura de OnTrack Assistant..."

# Función para hacer backup de la base de datos
backup_database() {
    echo "🗄️  Creando backup de la base de datos..."
    
    BACKUP_DIR="/var/www/ontrack/backups/database"
    TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
    BACKUP_FILE="database_backup_${TIMESTAMP}.sql"
    
    mkdir -p "$BACKUP_DIR"
    
    if [ -f "/var/www/ontrack/backend/.env" ]; then
        source /var/www/ontrack/backend/.env
        if command -v pg_dump &> /dev/null; then
            pg_dump "$DATABASE_URL" > "$BACKUP_DIR/$BACKUP_FILE"
            echo "✅ Backup de base de datos creado: $BACKUP_DIR/$BACKUP_FILE"
        else
            echo "⚠️  pg_dump no está disponible, saltando backup de base de datos"
        fi
    else
        echo "⚠️  No se encontró .env, saltando backup de base de datos"
    fi
}

# Función para restaurar base de datos si es necesario
restore_database() {
    echo "🔄 Restaurando base de datos desde el último backup..."
    
    BACKUP_DIR="/var/www/ontrack/backups/database"
    LATEST_BACKUP=$(ls -t "$BACKUP_DIR"/database_backup_*.sql 2>/dev/null | head -n1)
    
    if [ -n "$LATEST_BACKUP" ]; then
        if [ -f "/var/www/ontrack/backend/.env" ]; then
            source /var/www/ontrack/backend/.env
            if command -v psql &> /dev/null; then
                psql "$DATABASE_URL" < "$LATEST_BACKUP"
                echo "✅ Base de datos restaurada desde: $LATEST_BACKUP"
            else
                echo "❌ psql no está disponible para restaurar"
            fi
        else
            echo "❌ No se encontró .env para restaurar"
        fi
    else
        echo "❌ No se encontraron backups para restaurar"
    fi
}

# Función principal de actualización
update_application() {
    echo "📥 Actualizando aplicación desde GitHub..."
    
    # Actualizar frontend
    echo "🔄 Actualizando frontend..."
    cd /var/www/ontrack/frontend
    git stash || true
    git pull origin main
    npm install --include=dev
    npm run build
    
    # Actualizar backend
    echo "🔄 Actualizando backend..."
    cd /var/www/ontrack/backend
    git stash || true
    git pull origin main
    npm install
    
    # Generar cliente Prisma
    echo "🔧 Generando cliente Prisma..."
    npx prisma generate
    
    # Ejecutar migraciones (solo si es necesario)
    echo "🗄️  Verificando migraciones..."
    npx prisma db push --accept-data-loss=false
    
    # Reiniciar servicios
    echo "🔄 Reiniciando servicios..."
    pm2 restart ontrack-backend --update-env
    
    echo "✅ Actualización completada exitosamente"
}

# Función de rollback
rollback() {
    echo "🔄 Iniciando rollback..."
    restore_database
    echo "✅ Rollback completado"
}

# Función de verificación
verify_application() {
    echo "🔍 Verificando aplicación..."
    
    # Verificar que PM2 esté funcionando
    if pm2 list | grep -q "ontrack-backend.*online"; then
        echo "✅ Backend está funcionando"
    else
        echo "❌ Backend no está funcionando"
        return 1
    fi
    
    # Verificar que la base de datos esté accesible
    if [ -f "/var/www/ontrack/backend/.env" ]; then
        source /var/www/ontrack/backend/.env
        if command -v psql &> /dev/null; then
            if psql "$DATABASE_URL" -c "SELECT 1;" &>/dev/null; then
                echo "✅ Base de datos está accesible"
            else
                echo "❌ Base de datos no está accesible"
                return 1
            fi
        fi
    fi
    
    echo "✅ Verificación completada"
}

# Procesar argumentos
case "${1:-update}" in
    "update")
        backup_database
        update_application
        verify_application
        ;;
    "rollback")
        rollback
        ;;
    "backup")
        backup_database
        ;;
    "verify")
        verify_application
        ;;
    *)
        echo "Uso: $0 {update|rollback|backup|verify}"
        echo "  update   - Actualizar aplicación (default)"
        echo "  rollback - Restaurar desde backup"
        echo "  backup   - Solo hacer backup"
        echo "  verify   - Solo verificar estado"
        exit 1
        ;;
esac
