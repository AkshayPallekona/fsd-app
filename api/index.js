const app = require('../server/app');
const { connectDB } = require('../server/config/db');
const { validateEnv } = require('../server/config/env');

// Cache the DB connection across serverless invocations
let isConnected = false;

async function ensureDB() {
  if (isConnected) return;
  try {
    validateEnv();
    await connectDB();
    isConnected = true;
  } catch (err) {
    console.error('DB connection failed:', err.message);
    throw err;
  }
}

module.exports = async (req, res) => {
  try {
    await ensureDB();
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: { code: 'DB_CONNECTION_FAILED', message: 'Database connection failed' }
    });
  }
  return app(req, res);
};
