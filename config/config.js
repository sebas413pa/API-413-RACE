require('dotenv').config();

const NODE_ENV = process.env.NODE_ENV || 'production';

const config = {
  env: NODE_ENV,
  protocol: process.env.PROTOCOL || 'https',
  host: process.env.HOST || 'api.413-race.store',
  port: process.env.PORT || 443,
  apiPrefix: process.env.API_PREFIX || '/api',

  app: {
    name: process.env.APP_NAME || 'myapp',
    version: process.env.APP_VERSION || '0.0.1'
  },

  cors: {
    origin: process.env.CORS_ORIGIN || 'https://413-race.store'
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
  },
    google: {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET
  },
  mail: {
    mailUser: process.env.MAIL_USER,
    mailPass: process.env.MAIL_PASS,
    from: process.env.MAIL_FROM,
    brandLogoUrl: process.env.MAIL_BRAND_LOGO_URL,
    brandHeroUrl: process.env.MAIL_BRAND_HERO_URL,
    welcomeHeroUrl: process.env.MAIL_WELCOME_HERO_URL,
    quotationHeroUrl: process.env.MAIL_QUOTATION_HERO_URL,
    primaryColor: process.env.MAIL_BRAND_PRIMARY_COLOR || '#f44336',
    secondaryColor: process.env.MAIL_BRAND_SECONDARY_COLOR || '#111827',
    ctaUrl: process.env.MAIL_BRAND_CTA_URL
  },
  assets: {
    baseUrl: process.env.ASSET_BASE_URL
  }
};

module.exports = config;