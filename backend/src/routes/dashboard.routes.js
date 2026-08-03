const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/dashboard.controller');
const { verificarToken, permitirRoles } = require('../middleware/auth');

router.use(verificarToken);
router.get('/metricas', permitirRoles('gerente'), ctrl.metricas);

module.exports = router;
