import express from 'express';
import https from 'https';
import fs from 'fs';
import path from 'path';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { errorHandler, notFound } from './utils/errorHandler';

// Import routes
import authRoutes from './routes/auth';
import classRoutes from './routes/classes';
import studentRoutes from './routes/students';
import analysisRoutes from './routes/analysis';
import recordingRoutes from './routes/recordings';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
const HTTPS_PORT = process.env.HTTPS_PORT || 3443;

// Security middleware
app.use(helmet({
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));

// CORS configuration
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'https://localhost:8080',
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'), // limit each IP to 100 requests per windowMs
  message: {
    success: false,
    error: 'Too many requests from this IP, please try again later.'
  }
});

app.use('/api/', limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Logging middleware
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'OnTrack Backend API is running (HTTPS)',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    protocol: 'https'
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/classes', classRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/analysis', analysisRoutes);
app.use('/api/recordings', recordingRoutes);

// 404 handler
app.use(notFound);

// Error handling middleware
app.use(errorHandler);

// SSL Certificate paths
const sslKeyPath = process.env.SSL_KEY_PATH || path.join(__dirname, '../certs/server.key');
const sslCertPath = process.env.SSL_CERT_PATH || path.join(__dirname, '../certs/server.crt');

// Check if SSL certificates exist
const sslKeyExists = fs.existsSync(sslKeyPath);
const sslCertExists = fs.existsSync(sslCertPath);

if (sslKeyExists && sslCertExists) {
  // HTTPS Server
  const options = {
    key: fs.readFileSync(sslKeyPath),
    cert: fs.readFileSync(sslCertPath)
  };

  https.createServer(options, app).listen(HTTPS_PORT, () => {
    console.log(`🔒 HTTPS Server running on port ${HTTPS_PORT}`);
    console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🌐 CORS Origin: ${process.env.CORS_ORIGIN || 'https://localhost:8080'}`);
    console.log(`📝 Health check: https://localhost:${HTTPS_PORT}/health`);
    console.log(`🔐 SSL Certificates loaded from: ${sslCertPath}`);
  });
} else {
  console.warn('⚠️  SSL certificates not found. Starting HTTP server instead.');
  console.warn(`   Looking for key: ${sslKeyPath}`);
  console.warn(`   Looking for cert: ${sslCertPath}`);
  console.warn('   To enable HTTPS, place your SSL certificates in the certs/ directory');
  
  // Fallback to HTTP
  app.listen(PORT, () => {
    console.log(`🚀 HTTP Server running on port ${PORT}`);
    console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🌐 CORS Origin: ${process.env.CORS_ORIGIN || 'http://localhost:8080'}`);
    console.log(`📝 Health check: http://localhost:${PORT}/health`);
  });
}

export default app;
