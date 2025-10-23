const express = require('express');
const router = express.Router();
const config = require('../config/config');

// const authRoutes = require('./authRoutes');
// router.use('/auth', authRoutes);

router.get('/', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: `${config.app.name.toUpperCase()} API running successfully`,
    version: config.app.version,
    environment: config.env,
    docs: config.env !== 'production' ? `${config.protocol}://${config.host}:${config.port}/doc` : undefined,
  });
})
    
module.exports = router;