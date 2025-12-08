const { Sequelize } = require('sequelize');
const config = require('./config/config.js'); // Aquí importas config.js

const connectDB = async () => {
  const dbEnabled = (process.env.DB_ENABLED || 'false').toLowerCase() === 'true';

  if (!dbEnabled) {
    console.log('Base de datos deshabilitada. Servidor funcionando solo para juego en LAN.');
    return null;
  }

  const { username, password, database, host, port } = config.production; // Usar la configuración de producción

  try {
    console.log(`Conectando a la base de datos en host: ${host}`);

    const sequelize = new Sequelize(database, username, password, {
      host: host,
      port: parseInt(port, 10) || 5432,
      dialect: 'postgres',
      logging: false,
      dialectOptions: {
        ssl: {
          require: true,  // Esto asegura que la conexión es SSL
          rejectUnauthorized: false, // Esto permite que se acepte el certificado auto-firmado de Render
        },
      },
    });

    await sequelize.authenticate();
    await sequelize.sync();

    console.log("✅ Conectado a la base de datos Postgres en Render");
    return sequelize;
  } catch (err) {
    console.error("❌ Error conectando a la base de datos:", err.message);
    console.error("Revisa variables DB_* en .env");
    console.error("El servidor continuará sin DB para juego LAN.");
    return null;
  }
};

module.exports = connectDB;
