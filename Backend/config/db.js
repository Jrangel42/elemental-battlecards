const connectDB = async () => {
  // Verificar si la base de datos está habilitada
  const dbEnabled = (process.env.DB_ENABLED || 'false').toLowerCase() === 'true';
  
  if (!dbEnabled) {
    console.log('Base de datos deshabilitada. Servidor funcionando solo para juego en LAN.');
    return;
  }
  
  try {
    const { sequelize } = require('../models');
    await sequelize.authenticate();
    await sequelize.sync();
    if ((process.env.DB_USE_SQLITE || 'false').toLowerCase() === 'true') {
      console.log('Conectado a la base de datos SQLite (in-memory) para pruebas');
    } else {
      console.log('Conectado a la base de datos Postgres');
    }
  } catch (err) {
    console.error('Error conectando a la base de datos:', err.message);
    console.error('Si necesitas la base de datos, revisa la configuración DB_* en .env');
    console.error('El servidor continuará sin funcionalidad de autenticación.');
    // No salimos del proceso, permitimos que el servidor siga para juego LAN
  }
};

module.exports = connectDB;
