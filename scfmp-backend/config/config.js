require('dotenv').config();

const sslEnabled = process.env.DB_SSL !== 'false';
const productionDialectOptions = sslEnabled
  ? { ssl: { require: true, rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED === 'true' } }
  : {};

module.exports = {
  development: {
    username: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || null,
    database: process.env.DB_NAME || 'scfmp_db',
    host: process.env.DB_HOST || '127.0.0.1',
    port: process.env.DB_PORT || 3306,
    dialect: 'mysql',
    logging: false,
  },
  test: {
    username: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || null,
    database: process.env.DB_NAME_TEST || 'scfmp_db_test',
    host: process.env.DB_HOST || '127.0.0.1',
    port: process.env.DB_PORT || 3306,
    dialect: 'mysql',
    logging: false,
  },
  production: {
    url: process.env.DATABASE_URL,
    username: process.env.DB_USER || process.env.TIDB_USER,
    password: process.env.DB_PASSWORD || process.env.TIDB_PASSWORD,
    database: process.env.DB_NAME || process.env.TIDB_DATABASE,
    host: process.env.DB_HOST || process.env.TIDB_HOST,
    port: process.env.DB_PORT || process.env.TIDB_PORT || 3306,
    dialect: 'mysql',
    logging: false,
    dialectOptions: productionDialectOptions,
  },
};
