const express = require('express');
const router = express.Router();
const { login, me } = require('../controllers/auth.controller');
const { verificarToken } = require('../middleware/auth');

router.post('/login', login);
router.get('/me', verificarToken, me);

module.exports = router;
