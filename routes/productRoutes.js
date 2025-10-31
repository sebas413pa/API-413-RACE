const express = require('express');
const router = express.Router();
const controller = require('../controllers/productController');
const { authenticateJWT } = require('../middlewares/authMiddleware');
const { checkRole } = require('../middlewares/roleMiddleware');

router.get('/', authenticateJWT, checkRole(['Administrador','Empleado']), controller.listProducts);
router.post('/', authenticateJWT, checkRole(['Administrador','Empleado']), controller.createProduct);
router.put('/:product_id', authenticateJWT, checkRole(['Administrador','Empleado']), controller.updateProduct);
router.patch('/activate/:product_id', authenticateJWT, checkRole(['Administrador','Empleado']), controller.activateProduct);
router.patch('/deactivate/:product_id', authenticateJWT, checkRole(['Administrador','Empleado']), controller.deactivateProduct);

module.exports = router;
