/* eslint-disable no-console */
const app = require('./app');
const { PORT, NODE_ENV, validateEnv } = require('./config/env');
const { connectDB } = require('./config/db');

async function startServer() {
  let embeddedMongo = null;

  try {
    // Validate required environment variables on startup
    validateEnv();

    // Attempt to connect to MongoDB
    try {
      await connectDB();
      console.log('Connected to MongoDB.');
    } catch (dbErr) {
      // In development mode, if local MongoDB service is offline, automatically start embedded MongoDB
      if (
        NODE_ENV !== 'production' &&
        (dbErr.message.includes('ECONNREFUSED') || dbErr.message.includes('127.0.0.1:27017'))
      ) {
        console.warn('\n⚠️  Local MongoDB service is not running on port 27017.');
        console.log('🚀 Starting built-in MongoDB instance for local development...');
        const { MongoMemoryServer } = require('mongodb-memory-server');
        embeddedMongo = await MongoMemoryServer.create();
        const memUri = embeddedMongo.getUri();
        await connectDB(memUri);
        console.log(' Connected to built-in local MongoDB.');

        // Automatically seed sample data if fresh
        const Property = require('./models/Property');
        const count = await Property.countDocuments();
        if (count === 0) {
          console.log('🌱 Populating initial development sample listings & test accounts...');
          const seedDatabase = require('../scripts/seed');
          await seedDatabase(true);
        }
      } else {
        throw dbErr;
      }
    }

    const server = app.listen(PORT, () => {
      console.log('\n=============================================================');
      console.log(` Rental Portal running in [${NODE_ENV}] mode`);
      console.log(` Web Portal:  http://localhost:${PORT}`);
      console.log(` API Health:  http://localhost:${PORT}/health`);
      console.log('=============================================================\n');
    });

    // Graceful shutdown
    const gracefulShutdown = async () => {
      console.log('Received shutdown signal. Closing server...');
      server.close(async () => {
        if (embeddedMongo) {
          await embeddedMongo.stop();
        }
        console.log('Server closed. Process terminated.');
        process.exit(0);
      });
    };

    process.on('SIGTERM', gracefulShutdown);
    process.on('SIGINT', gracefulShutdown);
  } catch (error) {
    console.error('Server startup failed:', error.message);
    if (embeddedMongo) {
      await embeddedMongo.stop();
    }
    process.exit(1);
  }
}

if (require.main === module) {
  startServer();
}

module.exports = startServer;
