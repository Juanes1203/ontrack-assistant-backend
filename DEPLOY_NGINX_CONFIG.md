# Configuración de Nginx en Ubuntu

## ⚠️ Importante

El archivo `nginx.conf` en este repositorio es solo una **referencia/template**.

En Ubuntu, nginx usa el archivo: `/etc/nginx/sites-available/ontrack`

## 📝 Actualizar configuración de nginx en Ubuntu

Si haces cambios en `nginx.conf` del repositorio, debes actualizar también el archivo en Ubuntu:

```bash
# 1. Editar el archivo real que nginx usa
sudo nano /etc/nginx/sites-available/ontrack

# 2. Aplicar los mismos cambios que hiciste en nginx.conf del proyecto

# 3. Verificar la configuración
sudo nginx -t

# 4. Recargar nginx
sudo systemctl reload nginx

# 5. Verificar que los cambios se aplicaron
sudo nginx -T | grep -E "proxy_read_timeout|proxy_send_timeout|proxy_connect_timeout|send_timeout"
```

## 🔧 Configuración actual (para grabaciones de 1.5+ horas)

- `proxy_read_timeout`: 7200s (2 horas)
- `proxy_connect_timeout`: 7200s (2 horas)
- `proxy_send_timeout`: 7200s (2 horas)
- `send_timeout`: 7200s (2 horas)
- `client_max_body_size`: 100M

## 📍 Ubicación del archivo en Ubuntu

- Archivo activo: `/etc/nginx/sites-available/ontrack`
- Enlace simbólico: `/etc/nginx/sites-enabled/ontrack` → `/etc/nginx/sites-available/ontrack`

## 🔄 Proceso de actualización

1. Hacer cambios en `nginx.conf` del repositorio (como referencia)
2. Hacer commit y push a GitHub
3. En Ubuntu, actualizar manualmente `/etc/nginx/sites-available/ontrack`
4. Verificar y recargar nginx

