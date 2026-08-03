const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/evidencias.controller');
const { verificarToken } = require('../middleware/auth');
const { upload } = require('../middleware/upload');

router.use(verificarToken);

router.post('/', upload.single('archivo'), ctrl.subir);
router.get('/inspeccion/:inspeccionId', ctrl.listarPorInspeccion);

module.exports = router;
