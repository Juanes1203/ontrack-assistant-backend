#!/bin/bash

# Script de diagnóstico para el problema de grabación que se detiene a los 5 minutos
# Ejecutar en Ubuntu: bash scripts/diagnose-recording-issue.sh

echo "🔍 Diagnóstico del problema de grabación"
echo "========================================"
echo ""

# Colores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# 1. Verificar logs de PM2 (últimos errores)
echo -e "${YELLOW}1. Revisando logs de errores de PM2...${NC}"
echo "----------------------------------------"
pm2 logs ontrack-backend --err --lines 50 | tail -30
echo ""

# 2. Verificar logs de nginx
echo -e "${YELLOW}2. Revisando logs de errores de nginx...${NC}"
echo "----------------------------------------"
sudo tail -50 /var/log/nginx/error.log 2>/dev/null || echo "No se encontraron errores recientes en nginx"
echo ""

# 3. Verificar uso de memoria
echo -e "${YELLOW}3. Verificando uso de memoria del sistema...${NC}"
echo "----------------------------------------"
free -h
echo ""

# 4. Verificar uso de memoria de Node.js
echo -e "${YELLOW}4. Verificando uso de memoria de Node.js...${NC}"
echo "----------------------------------------"
pm2 list
pm2 describe ontrack-backend | grep -E "memory|cpu|restart"
echo ""

# 5. Verificar configuración de nginx activa
echo -e "${YELLOW}5. Verificando timeouts en nginx...${NC}"
echo "----------------------------------------"
sudo nginx -T 2>/dev/null | grep -E "proxy_read_timeout|proxy_send_timeout|proxy_connect_timeout|send_timeout" | head -10
echo ""

# 6. Verificar configuración del servidor Node.js
echo -e "${YELLOW}6. Verificando configuración del servidor Node.js...${NC}"
echo "----------------------------------------"
grep -E "timeout|keepAliveTimeout|headersTimeout" /var/www/ontrack/backend/dist/index.js 2>/dev/null | head -5 || echo "No se encontraron configuraciones de timeout en el código compilado"
echo ""

# 7. Verificar conexiones activas
echo -e "${YELLOW}7. Verificando conexiones activas al puerto 3001...${NC}"
echo "----------------------------------------"
sudo netstat -an | grep :3001 | grep ESTABLISHED | wc -l
echo "conexiones establecidas"
echo ""

# 8. Verificar procesos de Node.js
echo -e "${YELLOW}8. Verificando procesos de Node.js...${NC}"
echo "----------------------------------------"
ps aux | grep node | grep -v grep
echo ""

# 9. Verificar si hay archivos de nginx.conf en otros lugares
echo -e "${YELLOW}9. Verificando configuración de nginx activa...${NC}"
echo "----------------------------------------"
echo "Archivo de configuración principal:"
sudo nginx -T 2>/dev/null | grep -E "include.*nginx.conf" | head -3
echo ""

# 10. Verificar logs recientes de la aplicación
echo -e "${YELLOW}10. Últimas 30 líneas de logs de la aplicación...${NC}"
echo "----------------------------------------"
pm2 logs ontrack-backend --lines 30 --nostream | tail -30
echo ""

echo -e "${GREEN}✅ Diagnóstico completado${NC}"
echo ""
echo "📝 Próximos pasos:"
echo "   1. Revisa los errores en los logs de PM2"
echo "   2. Verifica si hay problemas de memoria"
echo "   3. Revisa los logs de nginx para errores de timeout"
echo "   4. Verifica que nginx esté usando la configuración correcta"

