require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const http = require('http');
const cors = require('cors');

// Importar las rutas de autenticación
const authRoutes = require('./routes/authRoutes');
const connectDB = require('./config/db');
const socketManager = require('./socketManager');

const app = express();
const PORT = process.env.PORT || 3000;

// Conectar a la base de datos
connectDB();

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Rutas
app.use('/api/auth', authRoutes);

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
