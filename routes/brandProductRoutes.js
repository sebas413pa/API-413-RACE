const express = require('express');
const router = express.Router();
const controller = require('../controllers/brandProductController');
const { authenticateJWT } = require('../middlewares/authMiddleware');
const { checkRole } = require('../middlewares/roleMiddleware');

router.get('/', authenticateJWT, checkRole(['Administrador','Empleado']), controller.listBrandProducts);
router.post('/', authenticateJWT, checkRole(['Administrador','Empleado']), controller.createBrandProduct);
router.put('/:brand_product_id', authenticateJWT, checkRole(['Administrador','Empleado']), controller.updateBrandProduct);
router.patch('/activate/:brand_product_id', authenticateJWT, checkRole(['Administrador','Empleado']), controller.activateBrandProduct);
router.patch('/deactivate/:brand_product_id', authenticateJWT, checkRole(['Administrador','Empleado']), controller.deactivateBrandProduct);

module.exports = router;
