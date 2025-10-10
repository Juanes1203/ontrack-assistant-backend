module.exports = {
  apps: [
    {
      name: 'ontrack-backend',
      cwd: '/var/www/ontrack/backend',
      script: 'dist/index.js',
      instances: 1,
      exec_mode: 'fork',
      
      // Límites de memoria y protección
      max_memory_restart: '500M',  // Reinicia si usa >500MB
      
      // Variables de entorno
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
        NODE_OPTIONS: '--max-old-space-size=512'  // Límite de heap de Node.js
      },
      
      // Auto-restart con límites
      autorestart: true,
      max_restarts: 5,      // Máximo 5 reinicios en 1 minuto
      min_uptime: '10s',    // Tiempo mínimo para considerar estable
      restart_delay: 4000,  // Espera 4s antes de reiniciar
      
      // Logs
      error_file: '/var/log/pm2/ontrack-backend-error.log',
      out_file: '/var/log/pm2/ontrack-backend-out.log',
      log_file: '/var/log/pm2/ontrack-backend.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      
      // Modo watch desactivado en producción
      watch: false,
      
      // Graceful shutdown
      kill_timeout: 5000,
      listen_timeout: 3000
    }
  ]
};
