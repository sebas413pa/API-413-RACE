const express = require('express');
const router = express.Router();
const saleController = require('../controllers/salesController');
const { authenticateJWT } = require('../middlewares/authMiddleware');
const { checkRole } = require('../middlewares/roleMiddleware');

router.get('/', authenticateJWT, checkRole(['Administrador','Empleado', 'Cliente']), saleController.listSales);
router.post('/', saleController.createdSale);

module.exports = router

