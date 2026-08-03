const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/estaciones.controller');
const { verificarToken, permitirRoles } = require('../middleware/auth');

router.use(verificarToken);

router.get('/', ctrl.listar);
router.get('/:id', ctrl.obtener);
router.post('/', permitirRoles('gerente'), ctrl.crear);
router.put('/:id', permitirRoles('gerente'), ctrl.actualizar);
router.delete('/:id', permitirRoles('gerente'), ctrl.eliminar);

module.exports = router;
