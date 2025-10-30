const express = require('express');
const router = express.Router();
const controller = require('../controllers/carCategoryController');
const { authenticateJWT } = require('../middlewares/authMiddleware');
const { checkRole } = require('../middlewares/roleMiddleware');

router.get('/', authenticateJWT, checkRole(['Administrador','Empleado']), controller.listCarCategories);
router.post('/', authenticateJWT, checkRole(['Administrador','Empleado']), controller.createCarCategory);
router.put('/:car_category_id', authenticateJWT, checkRole(['Administrador','Empleado']), controller.updateCarCategory);
router.patch('/activate/:car_category_id', authenticateJWT, checkRole(['Administrador','Empleado']), controller.activateCarCategory);
router.patch('/deactivate/:car_category_id', authenticateJWT, checkRole(['Administrador','Empleado']), controller.deactivateCarCategory);

module.exports = router;
