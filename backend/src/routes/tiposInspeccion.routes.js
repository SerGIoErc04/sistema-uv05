const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/tiposInspeccion.controller');
const { verificarToken } = require('../middleware/auth');

router.use(verificarToken);
router.get('/', ctrl.listar);

module.exports = router;
