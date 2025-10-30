const express = require('express');
const router = express.Router();
const config = require('../config/config');
const employeeRoutes = require('./employeeRoutes');
const authRoutes = require('./authRoutes');
const { authenticateJWT } = require('../middlewares/authMiddleware');
const { checkRole } = require('../middlewares/roleMiddleware');

router.use('/auth', authRoutes);
router.use('/employees', authenticateJWT, checkRole(['Administrador']), employeeRoutes);

router.get('/', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: `${config.app.name.toUpperCase()} API running successfully`,
    version: config.app.version,
    environment: config.env
  });
});

module.exports = router;