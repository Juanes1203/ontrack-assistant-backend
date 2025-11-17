#!/bin/bash

# Script de despliegue para el fix de timeouts de grabación
# Uso: bash scripts/deploy-timeout-fix.sh

set -e  # Salir si hay algún error

echo "🚀 Iniciando despliegue del fix de timeouts para grabaciones largas..."
echo ""

# Colores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 1. Pull del código
echo -e "${YELLOW}📥 Paso 1: Actualizando código desde GitHub...${NC}"
git pull origin main
echo -e "${GREEN}✅ Código actualizado${NC}"
echo ""

# 2. Instalar dependencias (por si hay cambios)
echo -e "${YELLOW}📦 Paso 2: Instalando dependencias...${NC}"
npm install
echo -e "${GREEN}✅ Dependencias instaladas${NC}"
echo ""

# 3. Build de producción
echo -e "${YELLOW}🔨 Paso 3: Compilando TypeScript...${NC}"
npm run build
echo -e "${GREEN}✅ Build completado${NC}"
echo ""

# 4. Verificar configuración de nginx
echo -e "${YELLOW}🔍 Paso 4: Verificando configuración de nginx...${NC}"
if sudo nginx -t; then
    echo -e "${GREEN}✅ Configuración de nginx válida${NC}"
else
    echo -e "${RED}❌ Error en configuración de nginx. Revisa el archivo nginx.conf${NC}"
    exit 1
fi
echo ""

# 5. Recargar nginx
echo -e "${YELLOW}🔄 Paso 5: Recargando nginx...${NC}"
sudo systemctl reload nginx
echo -e "${GREEN}✅ Nginx recargado${NC}"
echo ""

# 6. Reiniciar aplicación con PM2
echo -e "${YELLOW}🔄 Paso 6: Reiniciando aplicación Node.js...${NC}"
if pm2 restart all; then
    echo -e "${GREEN}✅ Aplicación reiniciada${NC}"
else
    echo -e "${YELLOW}⚠️  PM2 no encontró procesos. Intentando iniciar...${NC}"
    pm2 start ecosystem.config.js || pm2 start npm --name "ontrack-backend" -- start
fi
echo ""

# 7. Verificar que todo está funcionando
echo -e "${YELLOW}🔍 Paso 7: Verificando estado...${NC}"
sleep 3

# Verificar nginx
if sudo systemctl is-active --quiet nginx; then
    echo -e "${GREEN}✅ Nginx está corriendo${NC}"
else
    echo -e "${RED}❌ Nginx no está corriendo${NC}"
fi

# Verificar PM2
if pm2 list | grep -q "online"; then
    echo -e "${GREEN}✅ Aplicación Node.js está corriendo${NC}"
    echo ""
    echo -e "${YELLOW}📊 Estado de PM2:${NC}"
    pm2 list
else
    echo -e "${RED}❌ Aplicación Node.js no está corriendo${NC}"
fi

echo ""
echo -e "${GREEN}🎉 Despliegue completado!${NC}"
echo ""
echo "📝 Cambios aplicados:"
echo "   - Timeouts del servidor aumentados a 2 horas"
echo "   - Timeouts de nginx aumentados a 2 horas"
echo "   - client_max_body_size aumentado a 100MB"
echo ""
echo "🧪 Para verificar, revisa los logs:"
echo "   pm2 logs --lines 50"
echo ""
echo "🔍 Para verificar nginx:"
echo "   sudo nginx -t"
echo "   sudo systemctl status nginx"

