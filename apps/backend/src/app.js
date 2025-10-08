const express = require('express');
const cors = require('cors');
const attemptRoutes = require('./routes/attempts');
const datasetRoutes = require('./routes/dataset');
const { errorHandler, notFound } = require('./middleware/errorHandler');

const app = express();

const corsOptions = {
  origin: [
    'http://localhost:5173',
    'http://localhost:3000',
    'http://localhost:3001',
    process.env.FRONTEND_URL,
    process.env.CORS_ORIGIN
  ].filter(Boolean),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

if (process.env.NODE_ENV === 'development') {
  app.use((req, res, next) => {
    console.log(`${req.method} ${req.originalUrl} - ${new Date().toISOString()}`);
    next();
  });
}

app.get('/health', (req, res) => {
  const mongooseConnection = require('mongoose').connection;
  const openai = require('./config/openai');
  
  res.status(200).json({
    status: 'healthy',
    service: 'qualtrics-prompt-backend',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    services: {
      database: mongooseConnection.readyState === 1 ? 'connected' : 'disconnected',
      openai: openai ? 'configured' : 'not configured'
    },
    uptime: process.uptime()
  });
});

app.use('/api/attempts', attemptRoutes);
app.use('/api/dataset', datasetRoutes);

app.get('/', (req, res) => {
  res.json({
    message: 'Qualtrics Prompt Learning Backend API',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      attempts: '/api/attempts',
      dataset: '/api/dataset',
      docs: 'See README.md for full API documentation'
    }
  });
});

app.use(notFound);
app.use(errorHandler);

module.exports = app;