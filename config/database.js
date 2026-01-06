

const mongoose = require('mongoose');

// Connection options for better performance and stability
const connectionOptions = {
  // Connection pool settings
  maxPoolSize: 10,
  minPoolSize: 2,
  // Timeout settings
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
  // Heartbeat settings
  heartbeatFrequencyMS: 10000,
  // Write concern
  w: 'majority',
  // Read preference
  readPreference: 'primaryPreferred'
};

/**
 * Connect to MongoDB
 * @param {string} uri - MongoDB connection string (optional, uses env if not provided, haven't added its final form here for safety purposes)
 * @returns {Promise}
 */
async function connectDB(uri = null) {
  try {
    const connectionUri = uri || process.env.MONGODB_URI || 'mongodb://localhost:27017/wattapp';

    mongoose.connection.on('connected', () => {
      console.log('✅ MongoDB connected successfully');
    });

    mongoose.connection.on('error', (err) => {
      console.error('❌ MongoDB connection error:', err.message);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('⚠️ MongoDB disconnected');
    });

    process.on('SIGINT', async () => {
      await mongoose.connection.close();
      console.log('MongoDB connection closed due to app termination');
      process.exit(0);
    });

    await mongoose.connect(connectionUri, connectionOptions);
    return mongoose.connection;
  } catch (error) {
    console.error('❌ Failed to connect to MongoDB:', error.message);
    throw error;
  }
}

/**
 * Disconnect from MongoDB
 * @returns {Promise}
 */
async function disconnectDB() {
  try {
    await mongoose.connection.close();
    console.log('MongoDB connection closed');
  } catch (error) {
    console.error('Error closing MongoDB connection:', error.message);
    throw error;
  }
}

/**
 * Get database connection status
 * @returns {Object}
 */
function getConnectionStatus() {
  const states = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting'
  };

  return {
    state: states[mongoose.connection.readyState] || 'unknown',
    readyState: mongoose.connection.readyState,
    host: mongoose.connection.host,
    port: mongoose.connection.port,
    name: mongoose.connection.name
  };
}

/**
 * Sanitize connection string (remove credentials)
 * @param {string} host
 * @param {number} port
 * @param {string} dbName
 * @returns {string}
 */
function sanitizeConnectionString(host, port, dbName) {
  if (!host) return 'N/A';
  if (host.includes('mongodb.net')) {
    return `mongodb+srv://***@${host}/${dbName}`;
  }
  return `mongodb://${host}:${port || 27017}/${dbName}`;
}

/**
 * Check database health for /admin/healthcheck endpoint
 * @returns {Promise}
 */
async function checkHealth() {
  try {
    if (mongoose.connection.readyState !== 1) {
      throw new Error('Database not connected');
    }

    await mongoose.connection.db.admin().ping();

    const status = getConnectionStatus();
    const connectionString = sanitizeConnectionString(
        mongoose.connection.host,
        mongoose.connection.port,
        mongoose.connection.name
    );

    return {
      status: 'OK',
      dbconnection: connectionString,
      readyState: status.state,
      host: status.host,
      name: status.name
    };
  } catch (error) {
    return {
      status: 'FAIL',
      error: error.message,
      dbconnection: 'N/A'
    };
  }
}

/**
 * Get Mongoose instance for direct access if needed
 * @returns {mongoose}
 */
function getMongoose() {
  return mongoose;
}

/**
 * Get native MongoDB driver instance
 * @returns {Db|null}
 */
function getDb() {
  if (mongoose.connection.readyState !== 1) {
    return null;
  }
  return mongoose.connection.db;
}

module.exports = {
  connectDB,
  disconnectDB,
  getConnectionStatus,
  checkHealth,
  getMongoose,
  getDb,
  connectionOptions
};
