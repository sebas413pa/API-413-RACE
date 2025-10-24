const express = require('express');
const router = express.Router();
const config = require('../config/config');
const userRoutes = require('./userRoutes');
const authRoutes = require('./authRoutes');
const { authenticateJWT } = require('../middlewares/authMiddleware');
const { checkRole } = require('../middlewares/roleMiddleware');

router.use('/users', authenticateJWT, checkRole(['Administrador']), userRoutes);
router.use('/auth', authRoutes);

router.get('/', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: `${config.app.name.toUpperCase()} API running successfully`,
    version: config.app.version,
    environment: config.env
  });
});

module.exports = router;