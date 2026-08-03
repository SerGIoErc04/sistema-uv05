const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/resultados.controller');
const { verificarToken } = require('../middleware/auth');

router.use(verificarToken);

router.post('/', ctrl.registrar);
router.get('/inspeccion/:inspeccionId', ctrl.listarPorInspeccion);

module.exports = router;
