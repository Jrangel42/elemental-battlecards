const { sequelize } = require('../models');

const connectDB = async () => {
  try {
    await sequelize.authenticate();
    await sequelize.sync();
    if ((process.env.DB_USE_SQLITE || 'false').toLowerCase() === 'true') {
      console.log('Conectado a la base de datos SQLite (in-memory) para pruebas');
    } else {
      console.log('Conectado a la base de datos Postgres');
    }
  } catch (err) {
    console.error('Error conectando a Postgres:', err.message);
    console.error('Revisa que la configuración DB_* en .env sea correcta y que la base de datos esté accesible');
    process.exit(1);
  }
};

module.exports = connectDB;
