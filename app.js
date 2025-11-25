const express = require('express');
const { sequelize } = require('./db');
const config = require('./config/config');
const routes = require('./routes');
const logger = require('./utils/logger');
const cookieParser = require('cookie-parser');
const cors =require('cors');

const app = express();


const allowedOrigins = (process.env.CORS_ORIGIN || '').split(',').map(o => o.trim());

app.use(
  cors({
    origin: function(origin, callback) {
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        return callback(null, true); 
      } else {
        return callback(new Error("CORS no permitido para este origen: " + origin), false);
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  })
);

app.use(express.json());

const path = require('path');
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use(cookieParser());
app.use(`/${config.apiPrefix}`, routes);



sequelize.authenticate()
  .then(() => logger.info("DB connected"))
  .catch(err => logger.error("DB connection error", err));

app.get('/', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: `${config.app.name.toUpperCase()} API running successfully`,
    version: config.app.version,
    environment: config.env,
    docs: config.env !== 'production' ? `${config.protocol}://${config.host}:${config.port}/doc` : undefined,
  });
});

app.use((err, req, res, next) => {
  logger.error(err.message, { stack: err.stack });
  res.status(err.status || 500).json({
    error: config.env === 'production' ? 'Error interno' : err.message
  });
});

app.listen(config.port, () => {
  logger.info(`Server running at ${config.protocol}://${config.host}:${config.port}/${config.apiPrefix}`);
});