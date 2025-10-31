const express = require('express');
const router = express.Router();
const purchaseController = require('../controllers/purchasesController');
const { authenticateJWT } = require('../middlewares/authMiddleware');
const { checkRole } = require('../middlewares/roleMiddleware');

router.get('/', authenticateJWT, checkRole(['Administrador', 'Empleado']), purchaseController.listEntries);
router.post('/', authenticateJWT, checkRole(['Administrador', 'Empleado']), purchaseController.createEntry);
// router.put('/:supplier_id', authenticateJWT, checkRole(['Administrador', 'Empleado']), supplierController.updateSupplier);
// router.patch('/activate/:supplier_id', authenticateJWT, checkRole(['Administrador', 'Empleado']), supplierController.activateSupplier);
router.delete('/:purchase_id', authenticateJWT, checkRole(['Administrador', 'Empleado']), purchaseController.cancelEntry);

module.exports = router;
