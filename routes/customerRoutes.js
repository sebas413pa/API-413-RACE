const express = require('express');
const router = express.Router();
const customerController = require('../controllers/customerController')
const { authenticateJWT } = require('../middlewares/authMiddleware');
const { checkRole } = require('../middlewares/roleMiddleware');

router.get('/', authenticateJWT, checkRole(['Administrador', 'Empleado', 'Cliente']), customerController.listCustomers);
router.post('/',  customerController.createCustomer);
router.put('/:customer_id', authenticateJWT, checkRole(['Administrador', 'Empleado', 'Cliente']), customerController.updateCustomer);
router.patch('/activate/:customer_id', authenticateJWT, checkRole(['Administrador', 'Empleado']), customerController.activateCustomer);
router.patch('/deactivate/:customer_id', authenticateJWT, checkRole(['Administrador', 'Empleado']), customerController.deactivateCustomer);
router.get('/cities', customerController.listCities);
router.post('/guest', authenticateJWT, checkRole(['Administrador', 'Empleado']), customerController.createGuestCustomer)
//RECUPERACIÓN DE CONTRASEÑA
router.post('/forgot-password', customerController.forgotPassword);
router.post('/reset-password', customerController.resetPassword);


module.exports = router;