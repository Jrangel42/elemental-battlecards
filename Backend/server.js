require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const http = require('http');
const cors = require('cors');

// Importar módulos
const connectDB = require('./config/db');
const socketManager = require('./socketManager');

const app = express();
const PORT = process.env.PORT || 3001;

// Conectar a la base de datos (opcional)
connectDB();

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Rutas de autenticación (solo si la DB está habilitada)
const dbEnabled = (process.env.DB_ENABLED || 'false').toLowerCase() === 'true';
if (dbEnabled) {
  try {
    const authRoutes = require('./routes/authRoutes');
    app.use('/api/auth', authRoutes);
    console.log('Rutas de autenticación habilitadas');
  } catch (err) {
    console.warn('No se pudieron cargar las rutas de autenticación:', err.message);
  }
} else {
  console.log('Rutas de autenticación deshabilitadas (modo LAN)');
}

// Health check
app.get('/ping', (req, res) => {
    res.json({ ok: true, time: Date.now(), host: req.hostname });
});

const server = http.createServer(app);

// Inicializar socket.io
const { Server } = require('socket.io');
const io = new Server(server, {
    cors: {
        origin: '*'
    }
});

socketManager(io);

server.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor corriendo en http://0.0.0.0:${PORT} (escuchando todas las interfaces)`);
});
