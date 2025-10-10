#!/bin/bash

# Colores
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
NC='\033[0m' # No Color

# Umbrales
MEM_THRESHOLD=80  # 80% de memoria
DISK_THRESHOLD=85 # 85% de disco
CPU_THRESHOLD=90  # 90% de CPU

echo "🔍 Monitoreo de Recursos - OnTrack Backend"
echo "=========================================="
echo ""

# Verificar memoria
MEM_USAGE=$(free | grep Mem | awk '{print int($3/$2 * 100)}')
echo -n "💾 Memoria: $MEM_USAGE% "
if [ $MEM_USAGE -gt $MEM_THRESHOLD ]; then
    echo -e "${RED}⚠️  CRÍTICO${NC}"
    echo "   Acción: Considera detener el backend (emergency-stop)"
elif [ $MEM_USAGE -gt 60 ]; then
    echo -e "${YELLOW}⚠️  ALERTA${NC}"
else
    echo -e "${GREEN}✅ OK${NC}"
fi

# Verificar disco
DISK_USAGE=$(df -h / | awk 'NR==2 {print $5}' | sed 's/%//')
echo -n "💿 Disco: $DISK_USAGE% "
if [ $DISK_USAGE -gt $DISK_THRESHOLD ]; then
    echo -e "${RED}⚠️  CRÍTICO${NC}"
    echo "   Acción: Limpiar logs o archivos"
elif [ $DISK_USAGE -gt 70 ]; then
    echo -e "${YELLOW}⚠️  ALERTA${NC}"
else
    echo -e "${GREEN}✅ OK${NC}"
fi

# Verificar CPU
CPU_USAGE=$(top -bn1 | grep "Cpu(s)" | sed "s/.*, *\([0-9.]*\)%* id.*/\1/" | awk '{print int(100 - $1)}')
echo -n "🔥 CPU: $CPU_USAGE% "
if [ $CPU_USAGE -gt $CPU_THRESHOLD ]; then
    echo -e "${RED}⚠️  CRÍTICO${NC}"
    echo "   Acción: Investigar proceso (pm2 monit)"
elif [ $CPU_USAGE -gt 70 ]; then
    echo -e "${YELLOW}⚠️  ALERTA${NC}"
else
    echo -e "${GREEN}✅ OK${NC}"
fi

echo ""

# Estado de PM2
echo "📊 Estado PM2:"
pm2 status

echo ""
echo "💡 Comandos útiles:"
echo "   emergency-stop    - Detener inmediatamente"
echo "   pm2 logs         - Ver logs en tiempo real"
echo "   pm2 monit        - Dashboard de monitoreo"

