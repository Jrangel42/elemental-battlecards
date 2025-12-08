require('dotenv').config();
const { Sequelize } = require('sequelize');

const connectDB = async () => {
  const dbEnabled = (process.env.DB_ENABLED || 'false').toLowerCase() === 'true';

  if (!dbEnabled) {
    console.log('Base de datos deshabilitada. Servidor funcionando solo para juego en LAN.');
    return null;
  }

  try {
    const sequelize = new Sequelize(
      process.env.DB_NAME,
      process.env.DB_USER,
      process.env.DB_PASS,
      {
        host: process.env.DB_HOST,
        port: parseInt(process.env.DB_PORT, 10) || 5432,
        dialect: 'postgres',
        logging: false,
        dialectOptions: {
          ssl: {
            require: true,
            rejectUnauthorized: false, // 🔑 Importante para Render
          },
        },
      }
    );

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
