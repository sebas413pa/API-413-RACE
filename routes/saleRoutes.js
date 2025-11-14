const express = require('express');
const router = express.Router();
const saleController = require('../controllers/salesController');
const { authenticateJWT, optionalAuthenticateJWT } = require('../middlewares/authMiddleware');
const { checkRole } = require('../middlewares/roleMiddleware');

router.get('/', authenticateJWT, checkRole(['Administrador','Empleado', 'Cliente']), saleController.listSales);
// Report: ventas del último mes
router.get('/report/monthly', authenticateJWT, checkRole(['Administrador','Empleado']), saleController.reportMonthlySales);
router.post('/cars',  saleController.createCarSale);
router.post('/', optionalAuthenticateJWT, saleController.createdSale);
router.delete('/:saleId', authenticateJWT, checkRole(['Administrador','Empleado','Cliente']), saleController.cancelSale);
router.patch('/:saleId/status', authenticateJWT, checkRole(['Administrador','Empleado']), saleController.updateSaleStatus);

module.exports = router

