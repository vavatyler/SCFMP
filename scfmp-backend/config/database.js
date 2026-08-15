require('dotenv').config();

const { Sequelize } = require('sequelize');
const mysql2 = require('mysql2');
const env = process.env.NODE_ENV || 'development';
const config = require('./config.js')[env];

const options = {
    host: config.host,
    port: config.port,
    dialect: config.dialect,
    // Static reference ensures Vercel includes the MySQL driver in the Function bundle.
    dialectModule: mysql2,
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
