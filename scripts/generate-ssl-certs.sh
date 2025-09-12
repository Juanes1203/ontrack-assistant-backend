#!/bin/bash

# Script para generar certificados SSL de desarrollo
# Solo para uso en desarrollo, NO para producción

echo "🔐 Generando certificados SSL para desarrollo..."

# Crear directorio de certificados si no existe
mkdir -p certs

# Generar clave privada
openssl genrsa -out certs/server.key 2048

# Generar certificado autofirmado
openssl req -new -x509 -key certs/server.key -out certs/server.crt -days 365 -subj "/C=US/ST=State/L=City/O=Organization/CN=localhost"

echo "✅ Certificados generados:"
echo "   - certs/server.key (clave privada)"
echo "   - certs/server.crt (certificado)"
echo ""
echo "⚠️  IMPORTANTE: Estos son certificados de desarrollo autofirmados."
echo "   Para producción, usa certificados de una CA confiable como Let's Encrypt."
echo ""
echo "🚀 Para usar HTTPS en desarrollo:"
echo "   npm run dev:https"
