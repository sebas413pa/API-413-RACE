require('dotenv').config();

const NODE_ENV = process.env.NODE_ENV || 'development';

const config = {
  env: NODE_ENV,
  protocol: process.env.PROTOCOL || 'http',
  host: process.env.HOST || 'localhost',
  port: process.env.PORT || 3000,
  apiPrefix: process.env.API_PREFIX || '/api',

  app: {
    name: process.env.APP_NAME || 'myapp',
    version: process.env.APP_VERSION || '0.0.1'
  },

  cors: {
    origin: process.env.CORS_ORIGIN || '*'
  },

  log: {
    level: process.env.LOG_LEVEL || 'info',
  },

  db: {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database:
      NODE_ENV === 'test'
        ? process.env.DB_NAME_TEST
        : NODE_ENV === 'production'
        ? process.env.DB_NAME_PROD
        : process.env.DB_NAME,
    dialect: 'mysql',
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  },
  tokens: {
    accessSecret: process.env.ACCESS_TOKEN_SECRET,
    accessExpiration: process.env.ACCESS_TOKEN_EXPIRATION,
    refreshExpiration: process.env.REFRESH_TOKEN_EXPIRATION
  }
};

module.exports = config;