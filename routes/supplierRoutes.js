const express = require('express');
const router = express.Router();
const supplierController = require('../controllers/supplierController');
const { authenticateJWT } = require('../middlewares/authMiddleware');
const { checkRole } = require('../middlewares/roleMiddleware');

router.get('/', authenticateJWT, checkRole(['Administrador', 'Empleado']), supplierController.listSuppliers);
router.post('/', authenticateJWT, checkRole(['Administrador', 'Empleado']), supplierController.createSupplier);
router.put('/:supplier_id', authenticateJWT, checkRole(['Administrador', 'Empleado']), supplierController.updateSupplier);
router.patch('/activate/:supplier_id', authenticateJWT, checkRole(['Administrador', 'Empleado']), supplierController.activateSupplier);
router.patch('/deactivate/:supplier_id', authenticateJWT, checkRole(['Administrador', 'Empleado']), supplierController.deactivateSupplier);

module.exports = router;
