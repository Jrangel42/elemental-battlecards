// server/server.js
const express = require('express');
const bodyParser = require('body-parser');

// Importar las rutas de autenticación
const authRoutes = require('./routes/authRoutes');

const app = express();
const PORT = 3000;

// Middleware
app.use(bodyParser.json());

// Usar las rutas
// Todas las rutas en authRoutes estarán prefijadas con /api/auth
app.use('/api/auth', authRoutes);

app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
