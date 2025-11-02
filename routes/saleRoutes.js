const express = require('express');
const router = express.Router();
const saleController = require('../controllers/salesController');
const { authenticateJWT, optionalAuthenticateJWT } = require('../middlewares/authMiddleware');
const { checkRole } = require('../middlewares/roleMiddleware');

router.get('/', authenticateJWT, checkRole(['Administrador','Empleado', 'Cliente']), saleController.listSales);
router.post('/', optionalAuthenticateJWT, saleController.createdSale);
router.post('/:saleId/cancel', authenticateJWT, checkRole(['Administrador','Empleado','Cliente']), saleController.cancelSale);
router.patch('/:saleId/status', authenticateJWT, checkRole(['Administrador','Empleado']), saleController.updateSaleStatus);

module.exports = router

