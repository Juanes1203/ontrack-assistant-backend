#!/bin/bash

echo "🚨 EMERGENCY STOP ACTIVADO"
echo "=========================="

# Detener PM2
pm2 stop ontrack-backend
echo "✅ Backend detenido"

# Mostrar uso de recursos
echo ""
echo "📊 Recursos del sistema:"
free -h
df -h /
ps aux --sort=-%mem | head -10

echo ""
echo "Para reiniciar: pm2 start ecosystem.config.js"

