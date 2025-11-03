const express = require('express');
const router = express.Router();
const controller = require('../controllers/carLineController');
const { authenticateJWT } = require('../middlewares/authMiddleware');
const { checkRole } = require('../middlewares/roleMiddleware');

router.get('/', controller.listCarLines);
router.post('/', authenticateJWT, checkRole(['Administrador','Empleado']), controller.createCarLine);
router.put('/:line_id', authenticateJWT, checkRole(['Administrador','Empleado']), controller.updateCarLine);
router.patch('/activate/:line_id', authenticateJWT, checkRole(['Administrador','Empleado']), controller.activateCarLine);
router.patch('/deactivate/:line_id', authenticateJWT, checkRole(['Administrador','Empleado']), controller.deactivateCarLine);

module.exports = router;
