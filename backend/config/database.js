const {
    Sequelize
} = require('sequelize');
require('dotenv').config();

// Validate required environment variables
const requiredEnvVars = ['DB_NAME', 'DB_USER', 'DB_PASSWORD', 'DB_HOST', 'DB_PORT'];
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
    console.error('❌ Missing required environment variables:', missingVars.join(', '));
    console.error('Please check your .env file and ensure all database configuration variables are set.');
    process.exit(1);
}

const sequelize = new Sequelize(process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASSWORD, {
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT, 10) || 3306, // Convert port to number
    dialect: 'mysql',
    timezone: '+05:30', // ✅ very important
    logging: (msg) => {
      // Log SQL queries in development mode or if explicitly enabled
      if (process.env.NODE_ENV === 'development' || process.env.DB_LOGGING === 'true') {
        console.log('📝 SQL:', msg);
      }
    },
    pool: {
        max: 10, // Maximum number of connection in pool
        min: 1, // Minimum number of connection in pool
        acquire: 30000, // Maximum time (in milliseconds) that pool will try to get a connection before throwing error
        idle: 10000 // Maximum time (in milliseconds) that a connection can be idle before being released
    },
    define: {
        timestamps: false // Optional, disables automatic timestamp columns if not needed
    },
    dialectOptions: {
        connectTimeout: 60000, // 60 seconds timeout
    },
    retry: {
        max: 3, // Maximum number of retries
        match: [
            /ETIMEDOUT/,
            /EHOSTUNREACH/,
            /ECONNREFUSED/,
            /ER_ACCESS_DENIED_ERROR/,
            /SequelizeConnectionError/,
            /SequelizeConnectionRefusedError/,
            /SequelizeHostNotFoundError/,
            /SequelizeHostNotReachableError/,
            /SequelizeInvalidConnectionError/,
            /SequelizeConnectionTimedOutError/
        ]
    }
});

module.exports = sequelize;