const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/usuarios.controller');
const { verificarToken, permitirRoles } = require('../middleware/auth');

router.use(verificarToken);

router.get('/', permitirRoles('gerente'), ctrl.listar);
router.get('/:id', permitirRoles('gerente'), ctrl.obtener);
router.post('/', permitirRoles('gerente'), ctrl.crear);
router.put('/:id', permitirRoles('gerente'), ctrl.actualizar);
router.delete('/:id', permitirRoles('gerente'), ctrl.eliminar);

module.exports = router;
