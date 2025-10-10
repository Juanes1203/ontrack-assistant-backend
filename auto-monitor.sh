#!/bin/bash

LOG_FILE="/home/ubuntu/resource-monitor.log"
DATE=$(date '+%Y-%m-%d %H:%M:%S')

# Verificar memoria
MEM_USAGE=$(free | grep Mem | awk '{print int($3/$2 * 100)}')

# Si memoria > 85%, detener y alertar
if [ $MEM_USAGE -gt 85 ]; then
    echo "[$DATE] 🚨 MEMORIA CRÍTICA: $MEM_USAGE% - DETENIENDO BACKEND" >> $LOG_FILE
    pm2 stop ontrack-backend
    echo "[$DATE] ✅ Backend detenido por seguridad" >> $LOG_FILE
    
    # Enviar notificación
    echo "ALERTA: Backend detenido por alto uso de memoria ($MEM_USAGE%)" | wall
fi

# Verificar si el backend se reinició demasiadas veces
RESTARTS=$(pm2 jlist | jq '.[0].pm2_env.restart_time' 2>/dev/null || echo 0)
if [ $RESTARTS -gt 10 ]; then
    echo "[$DATE] 🚨 DEMASIADOS REINICIOS: $RESTARTS - DETENIENDO" >> $LOG_FILE
    pm2 stop ontrack-backend
fi

