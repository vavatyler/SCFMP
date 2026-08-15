require('dotenv').config();

const { Sequelize } = require('sequelize');
const env = process.env.NODE_ENV || 'development';
const config = require('./config.js')[env];

const options = {
    host: config.host,
    port: config.port,
    dialect: config.dialect,
    logging: config.logging,
    dialectOptions: config.dialectOptions || {},
    define: {
      underscored: true, // snake_case columns (created_at, cooperative_id, etc.)
      timestamps: true,
    },
    pool: {
      max: env === 'production' ? 2 : 10,
      min: 0,
      acquire: 30000,
      idle: 10000,
    },
  };

const sequelize = config.url
  ? new Sequelize(config.url, options)
  : new Sequelize(config.database, config.username, config.password, options);

module.exports = sequelize;
