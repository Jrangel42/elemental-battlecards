require('dotenv').config();
const { Sequelize, DataTypes } = require('sequelize');

const useSqlite = (process.env.DB_USE_SQLITE || 'false').toLowerCase() === 'true';

let sequelize;
if (useSqlite) {
  // SQLite in-memory for quick local testing without Postgres
  sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: ':memory:',
    logging: false
  });
} else {
  const host = process.env.DB_HOST || '127.0.0.1';
  const port = process.env.DB_PORT || 5432;
  const database = process.env.DB_NAME || 'elemental';
  const username = process.env.DB_USER || 'postgres';
  const password = process.env.DB_PASS || 'password';

  sequelize = new Sequelize(database, username, password, {
    host,
    port,
    dialect: 'postgres',
    logging: false
  });
}

const db = {};
db.Sequelize = Sequelize;
db.sequelize = sequelize;

// Import models
const User = require('./user')(sequelize, DataTypes);

db.User = User;

module.exports = db;
