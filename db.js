const { Sequelize } = require('sequelize');
const config = require('./config/config');
const initModels = require('./models/init-models');
const logger = require('./utils//logger');

const sequelize = new Sequelize(
  config.db.database,
  config.db.user,
  config.db.password,
  {
    host: config.db.host,
    dialect: config.db.dialect,
    timezone: '-06:00',
    pool: config.db.pool,
    logging: config.env !== 'production' 
      ? (msg) => logger.debug(msg)  
      : false
  }
);


const models = initModels(sequelize);
module.exports = { sequelize, models };