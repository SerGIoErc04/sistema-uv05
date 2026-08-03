const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/inspecciones.controller');
const { verificarToken, permitirRoles } = require('../middleware/auth');

router.use(verificarToken);

router.get('/', ctrl.listar);
router.get('/:id', ctrl.obtener);
router.post('/', permitirRoles('gerente'), ctrl.crear);
router.put('/:id', permitirRoles('gerente'), ctrl.actualizar);
router.delete('/:id', permitirRoles('gerente'), ctrl.eliminar);
router.patch('/:id/estatus', ctrl.cambiarEstatus);
router.patch('/:id/horario', ctrl.actualizarHorario);
router.put('/:id/datos-generales', ctrl.guardarDatosGenerales);
router.put('/:id/tanques', ctrl.guardarTanques);
router.get('/:id/orden-trabajo', ctrl.ordenTrabajo);

module.exports = router;
