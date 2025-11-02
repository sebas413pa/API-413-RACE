const express = require('express');
const router = express.Router();
const quotationController = require('../controllers/quotationsController');
const { authenticateJWT } = require('../middlewares/authMiddleware');
const { checkRole } = require('../middlewares/roleMiddleware');

router.get(
    '/',
    authenticateJWT,
    checkRole(['Administrador', 'Empleado', 'Cliente']),
    quotationController.listQuotations
);

router.post(
    '/',
    authenticateJWT,
    checkRole(['Administrador', 'Empleado', 'Cliente']),
    quotationController.createQuotation
);

router.patch(
    '/:quotationId/status',
    authenticateJWT,
    checkRole(['Administrador', 'Empleado']),
    quotationController.updateQuotationStatus
);

module.exports = router;
