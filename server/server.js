const app = require('./app');
const { PORT, NODE_ENV, validateEnv } = require('./config/env');
const { connectDB } = require('./config/db');

async function startServer() {
  try {
    // Validate required environment variables on startup
    validateEnv();

    // Connect to database
    await connectDB();
    // eslint-disable-next-line no-console
    console.log('Connected to MongoDB.');

    const server = app.listen(PORT, () => {
      // eslint-disable-next-line no-console
      console.log(`Rental Portal server running in [${NODE_ENV}] mode on port ${PORT}`);
    });

    // Graceful shutdown
    const gracefulShutdown = () => {
      // eslint-disable-next-line no-console
      console.log('Received shutdown signal. Closing server...');
      server.close(() => {
        // eslint-disable-next-line no-console
        console.log('Server closed. Process terminated.');
        process.exit(0);
      });
    };

    process.on('SIGTERM', gracefulShutdown);
    process.on('SIGINT', gracefulShutdown);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Server startup failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  startServer();
}

module.exports = startServer;
