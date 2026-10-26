process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'super_secret_test_jwt_key_at_least_32_chars_long';
process.env.JWT_EXPIRES_IN = '1h';
process.env.EMAIL_MODE = 'console';
process.env.MODERATION_REQUIRED = 'false';

let mongod;
let mongoose;

// Only initialize MongoMemoryServer in Node environment (skip in JSDOM frontend tests)
if (typeof window === 'undefined') {
  const { MongoMemoryServer } = require('mongodb-memory-server');
  mongoose = require('mongoose');

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();
    await mongoose.connect(uri);
  });

  afterEach(async () => {
    if (mongoose.connection.readyState === 1) {
      const collections = mongoose.connection.collections;
      for (const key of Object.keys(collections)) {
        await collections[key].deleteMany({});
      }
    }
  });

  afterAll(async () => {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    if (mongod) {
      await mongod.stop();
    }
  });
}
