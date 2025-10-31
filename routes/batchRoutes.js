const express = require('express');
const router = express.Router();
const batchController = require('../controllers/batchController');
const { authenticateJWT } = require('../middlewares/authMiddleware');
const { checkRole } = require('../middlewares/roleMiddleware');

// List batches with optional date filters (received_at or expires_at)
router.get('/', authenticateJWT, checkRole(['Administrador', 'Empleado']), batchController.listBatches);

module.exports = router;
