const mongoose = require('mongoose');
const { MONGODB_URI } = require('./env');

let isConnected = false;

async function connectDB(customUri) {
  if (isConnected && mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  const uri = customUri || MONGODB_URI;
  try {
    const conn = await mongoose.connect(uri, {
      autoIndex: true
    });
    isConnected = true;
    return conn;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to connect to MongoDB:', error.message);
    throw error;
  }
}

async function disconnectDB() {
  if (isConnected) {
    await mongoose.disconnect();
    isConnected = false;
  }
}

module.exports = {
  connectDB,
  disconnectDB
};
