# 🛡️ Sistema de Protección y Monitoreo - OnTrack Backend

Sistema de seguridad para prevenir crashes, agotamiento de recursos y sobrecarga del servidor.

---

## 🚀 Instalación Rápida (En Ubuntu)

```bash
cd /var/www/ontrack/backend

# 1. Dar permisos a los scripts
chmod +x emergency-stop.sh monitor-resources.sh auto-monitor.sh

# 2. Crear aliases útiles
cat >> ~/.bashrc << 'EOF'
alias emergency-stop="/var/www/ontrack/backend/emergency-stop.sh"
alias check-resources="/var/www/ontrack/backend/monitor-resources.sh"
EOF
source ~/.bashrc

# 3. Configurar monitoreo automático (cada 5 minutos)
(crontab -l 2>/dev/null; echo "*/5 * * * * /var/www/ontrack/backend/auto-monitor.sh") | crontab -

# 4. Recargar PM2 con nueva configuración
pm2 reload ecosystem.config.js

# 5. Verificar instalación
check-resources
```

---

## 🛡️ Protecciones Implementadas

### 1. **Límites de Memoria PM2**
- **Max Memory**: 500MB
- **Acción**: Auto-restart si se excede
- **Heap Limit**: 512MB para Node.js

### 2. **Límites de Reinicios**
- **Max Restarts**: 5 en 1 minuto
- **Min Uptime**: 10 segundos
- **Restart Delay**: 4 segundos

### 3. **Rate Limiting OpenAI**
- **Delay**: 300ms entre llamadas
- **Previene**: Sobrecarga de API y costos excesivos

### 4. **Límite de Chunks**
- **Max Chunks**: 50 por documento
- **Previene**: Documentos muy grandes que consumen demasiado

### 5. **Monitoreo Automático**
- **Frecuencia**: Cada 5 minutos
- **Acción**: Detiene backend si memoria >85%
- **Log**: `/home/ubuntu/resource-monitor.log`

---

## 🚨 Comandos de Emergencia

### Parada de Emergencia
```bash
emergency-stop
```
Detiene inmediatamente el backend y muestra uso de recursos.

### Verificar Recursos
```bash
check-resources
```
Muestra estado actual de:
- 💾 Memoria (crítico >80%)
- 💿 Disco (crítico >85%)
- 🔥 CPU (crítico >90%)
- 📊 Estado PM2

### Monitoreo en Tiempo Real
```bash
pm2 monit
```

### Ver Logs de Errores
```bash
pm2 logs ontrack-backend --err --lines 50
```

### Reinicio Seguro
```bash
pm2 restart ontrack-backend
```

### Limpiar Logs (si están muy grandes)
```bash
pm2 flush
```

---

## 📊 Umbrales de Alertas

| Recurso | Normal | Alerta | Crítico | Acción |
|---------|--------|--------|---------|--------|
| Memoria | <60% | 60-80% | >80% | ⚠️ Monitorear |
| Memoria | - | - | >85% | 🚨 Auto-stop |
| Disco | <70% | 70-85% | >85% | ⚠️ Limpiar |
| CPU | <70% | 70-90% | >90% | ⚠️ Investigar |
| Reinicios | <3 | 3-5 | >10 | 🚨 Auto-stop |

---

## 📋 Verificación del Sistema

```bash
# 1. Ver límites de PM2
pm2 show ontrack-backend | grep -E "(memory|restart)"

# 2. Ver logs de monitoreo
cat /home/ubuntu/resource-monitor.log

# 3. Verificar cron job
crontab -l | grep monitor

# 4. Ver uso actual de memoria
free -h

# 5. Ver espacio en disco
df -h

# 6. Ver procesos que más usan memoria
ps aux --sort=-%mem | head -10
```

---

## 🔄 Flujo de Protección Automática

```
┌─────────────────────────────────────────┐
│  Cron Job (cada 5 minutos)              │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│  Verificar Memoria                      │
│  - Si > 85% → DETENER BACKEND          │
│  - Registrar en log                     │
│  - Enviar alerta (wall)                 │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│  Verificar Reinicios                    │
│  - Si > 10 → DETENER BACKEND           │
│  - Registrar en log                     │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│  PM2 Auto-restart                       │
│  - Si memoria > 500MB → RESTART        │
│  - Max 5 reinicios/min                  │
└─────────────────────────────────────────┘
```

---

## 🔧 Configuración Personalizada

### Cambiar Umbral de Memoria
Editar `auto-monitor.sh`:
```bash
# Cambiar de 85 a otro valor
if [ $MEM_USAGE -gt 85 ]; then
```

### Cambiar Límite de PM2
Editar `ecosystem.config.js`:
```javascript
max_memory_restart: '500M',  // Cambiar a '1G' si necesitas más
```

### Cambiar Rate Limit OpenAI
Editar `src/services/vectorizationService.ts`:
```typescript
const RATE_LIMIT_DELAY = 300;  // Aumentar si hay muchos errores de rate limit
```

### Cambiar Límite de Chunks
Editar `src/services/vectorizationService.ts`:
```typescript
const MAX_CHUNKS_PER_DOCUMENT = 50;  // Aumentar si documentos grandes
```

---

## 📝 Logs Importantes

### Logs de PM2
```bash
# Salida normal
tail -f /var/log/pm2/ontrack-backend-out.log

# Errores
tail -f /var/log/pm2/ontrack-backend-error.log
```

### Logs de Monitoreo
```bash
# Ver log de monitoreo automático
tail -f /home/ubuntu/resource-monitor.log
```

---

## 🚨 Escenarios de Emergencia

### Caso 1: Memoria Alta
```bash
# Síntoma: check-resources muestra >80%
# Acción:
1. emergency-stop
2. Investigar: ps aux --sort=-%mem | head -10
3. Limpiar si es necesario: pm2 flush
4. Reiniciar: pm2 start ecosystem.config.js
```

### Caso 2: Muchos Reinicios
```bash
# Síntoma: Backend se reinicia constantemente
# Acción:
1. pm2 logs ontrack-backend --err
2. Identificar el error
3. Detener: pm2 stop ontrack-backend
4. Corregir el problema
5. Reiniciar: pm2 start ecosystem.config.js
```

### Caso 3: Disco Lleno
```bash
# Síntoma: check-resources muestra disco >85%
# Acción:
1. Ver qué ocupa espacio: du -sh /var/www/ontrack/backend/* | sort -h
2. Limpiar logs: pm2 flush
3. Limpiar node_modules y reinstalar si es necesario
4. Limpiar archivos temporales: rm -rf /var/www/ontrack/backend/temp/*
```

### Caso 4: CPU Alta
```bash
# Síntoma: CPU >90% constantemente
# Acción:
1. pm2 monit
2. Verificar qué proceso consume CPU
3. Si es vectorización, esperar o detener documento en proceso
4. Considerar aumentar RATE_LIMIT_DELAY
```

---

## ✅ Checklist de Seguridad

Después de instalar, verificar:

- [ ] Scripts tienen permisos de ejecución (`ls -la *.sh`)
- [ ] Aliases funcionan (`emergency-stop --help` o `which emergency-stop`)
- [ ] Cron job configurado (`crontab -l`)
- [ ] PM2 con nuevos límites (`pm2 show ontrack-backend`)
- [ ] Logs se están creando (`ls -la /var/log/pm2/`)
- [ ] Monitoreo automático funciona (esperar 5 min y verificar log)

---

## 🔮 Mejoras Futuras

- [ ] Notificaciones por email/Slack cuando hay alertas
- [ ] Dashboard web de monitoreo
- [ ] Backup automático antes de detener
- [ ] Integración con servicios de APM (Application Performance Monitoring)
- [ ] Alertas proactivas basadas en tendencias

---

## 📚 Recursos Adicionales

- [PM2 Documentation](https://pm2.keymetrics.io/docs/usage/quick-start/)
- [Node.js Memory Management](https://nodejs.org/en/docs/guides/simple-profiling/)
- [Linux Resource Monitoring](https://www.linux.com/training-tutorials/linux-system-monitoring-tools/)

---

**¡Sistema de protección activo!** 🛡️

