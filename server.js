require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const errorHandler = require('./middleware/errorHandler');

const app = express();

// Middleware
app.use(cors());
app.use(morgan('dev'));
app.use(express.json({ limit: '5mb' }));

// Placeholder Routes
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
