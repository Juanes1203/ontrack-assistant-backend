module.exports = {
  apps: [
    {
      name: 'ontrack-backend',
      cwd: '/var/www/ontrack/backend',
      script: 'dist/index.js',
      instances: 1,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3001
      },
      error_file: '/var/log/pm2/ontrack-backend-error.log',
      out_file: '/var/log/pm2/ontrack-backend-out.log',
      log_file: '/var/log/pm2/ontrack-backend.log'
    }
  ]
};
