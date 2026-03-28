require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const errorHandler = require('./middleware/errorHandler');
const db = require('./config/databaseConfig');

const app = express();

// Trust proxy (Render runs behind a reverse proxy)
app.set('trust proxy', 1);

// CORS — tightened for production
const corsOptions = {
  origin: process.env.NODE_ENV === 'production'
    ? (process.env.CORS_ORIGIN || '').split(',')
    : ['http://localhost:5173', 'http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Partner-Password', 'X-Unlock-Token'],
  exposedHeaders: ['X-Unlock-Token', 'X-Unlock-Expires']
};
app.use(cors(corsOptions));

// Conditional logging
if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}

app.use(express.json({ limit: '5mb' }));

// Health check (Render pings this)
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'success', message: 'API is running' });
});

app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/activities', require('./routes/activityRoutes'));
app.use('/api/summary', require('./routes/summaryRoutes'));
app.use('/api/categories', require('./routes/categoryRoutes'));
app.use('/api/sessions', require('./routes/sessionRoutes'));
app.use('/api/export', require('./routes/exportRoutes'));
app.use('/api/alerts', require('./routes/alertRoutes'));
app.use('/api/blocker', require('./routes/blockerRoutes'));
app.use('/api/accountability', require('./middleware/auth').protect, require('./routes/accountabilityRoutes'));
app.use('/api/unblock-requests', require('./routes/unblockRequestRoutes'));
const auth = require('./middleware/auth');
app.post('/api/heartbeat', auth.protect, require('./controllers/accountabilityController').recordHeartbeat);

// Unhandled route
app.use((req, res, next) => {
  res.status(404).json({
    status: 'fail',
    message: `Can't find ${req.originalUrl} on this server!`
  });
});

// Global Error Handler
app.use(errorHandler);

const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
  
  // Hourly cleanup cron
  setInterval(async () => {
    try {
      // 1. Expire pending unblock requests older than 24 hours
      const { deleteExpiredPending } = require('./repositories/unblockRequestRepository');
      const count = await deleteExpiredPending(24);
      if (count > 0) console.log(`Cleaned up ${count} expired pending unblock requests.`);

      // 2. Re-block domains whose temp_unblock_until has passed
      await db.query(`
        UPDATE blocked_domains
        SET temp_unblock_until = NULL
        WHERE temp_unblock_until IS NOT NULL
          AND temp_unblock_until < NOW()
      `);
    } catch (e) {
      console.error('Failed to run cleanup cron:', e);
    }
  }, 1000 * 60 * 60);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  server.close(() => {
    console.log('Process terminated!');
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received. Shutting down gracefully...');
  server.close(() => {
    console.log('Process terminated!');
  });
});
