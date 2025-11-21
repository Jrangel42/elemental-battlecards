const express = require('express');
const router = express.Router();

// Importamos el controlador de autenticación
const { registerUser, loginUser } = require('../controllers/authController');

// @route   POST /api/auth/register
// @desc    Registra un nuevo usuario
router.post('/register', registerUser);

// @route   POST /api/auth/login
// @desc    Inicia sesión y devuelve un token
router.post('/login', loginUser);

module.exports = router;

