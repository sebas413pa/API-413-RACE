const express = require('express');
const router = express.Router();
const controller = require('../controllers/categoryProductController');
const { authenticateJWT } = require('../middlewares/authMiddleware');
const { checkRole } = require('../middlewares/roleMiddleware');

router.get('/', controller.listCategoryProducts);
router.post('/', authenticateJWT, checkRole(['Administrador','Empleado']), controller.createCategoryProduct);
router.put('/:category_product_id', authenticateJWT, checkRole(['Administrador','Empleado']), controller.updateCategoryProduct);
router.patch('/activate/:category_product_id', authenticateJWT, checkRole(['Administrador','Empleado']), controller.activateCategoryProduct);
router.patch('/deactivate/:category_product_id', authenticateJWT, checkRole(['Administrador','Empleado']), controller.deactivateCategoryProduct);

module.exports = router;
