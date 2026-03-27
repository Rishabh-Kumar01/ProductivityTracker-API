const { Pool } = require('pg');

// Neon free tier: use the DIRECT endpoint (not pooler) for reliable auto-wake.
// Strip '-pooler' from hostname and remove channel_binding (unsupported by PgBouncer).
const connectionString = (process.env.DATABASE_URL || '')
  .replace(/-pooler\./g, '.')
  .replace(/[&?]channel_binding=[^&]*/g, '');

const pool = new Pool({
  connectionString,
  max: 5,
  idleTimeoutMillis: 20000,
  connectionTimeoutMillis: 15000,
  ssl: {
    rejectUnauthorized: false,
  },
});

pool.on('error', (err, client) => {
  console.error('Idle pg client error (will recover):', err.message);
});

// Retry query once on connection reset
const queryWithRetry = async (text, params) => {
  try {
    return await pool.query(text, params);
  } catch (err) {
    if (err.code === 'ECONNRESET' || err.code === 'EPIPE' || err.code === '57P01') {
      console.log('Connection reset, retrying query...');
      return await pool.query(text, params);
    }
    throw err;
  }
};

// Retry pool.connect() once on stale connection
const connectWithRetry = async () => {
  try {
    const client = await pool.connect();
    // Test the connection is alive
    await client.query('SELECT 1');
    return client;
  } catch (err) {
    console.log('Connect failed, retrying...', err.message);
    return await pool.connect();
  }
};

module.exports = {
  query: queryWithRetry,
  connect: connectWithRetry,
  pool
};
