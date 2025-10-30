const express = require('express');
const router = express.Router();
const controller = require('../controllers/carBrandController');
const { authenticateJWT } = require('../middlewares/authMiddleware');
const { checkRole } = require('../middlewares/roleMiddleware');

router.get('/', authenticateJWT, checkRole(['Administrador','Empleado']), controller.listCarBrands);
router.post('/', authenticateJWT, checkRole(['Administrador','Empleado']), controller.createCarBrand);
router.put('/:brand_id', authenticateJWT, checkRole(['Administrador','Empleado']), controller.updateCarBrand);
router.patch('/activate/:brand_id', authenticateJWT, checkRole(['Administrador','Empleado']), controller.activateCarBrand);
router.patch('/deactivate/:brand_id', authenticateJWT, checkRole(['Administrador','Empleado']), controller.deactivateCarBrand);

module.exports = router;
