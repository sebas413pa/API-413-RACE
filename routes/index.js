const express = require('express');
const router = express.Router();
const config = require('../config/config');
const employeeRoutes = require('./employeeRoutes');
const authRoutes = require('./authRoutes');
const customerRoutes = require('./customerRoutes');
const supplierRoutes = require('./supplierRoutes');
const batchRoutes = require('./batchRoutes');
const brandProductRoutes = require('./brandProductRoutes');
const carBrandRoutes = require('./carBrandRoutes');
const carCategoryRoutes = require('./carCategoryRoutes');
const carImageRoutes = require('./carImageRoutes');
const carLineRoutes = require('./carLineRoutes');
const carRoutes = require('./carRoutes');
const categoryProductRoutes = require('./categoryProductRoutes');
const productRoutes = require('./productRoutes');
const { authenticateJWT } = require('../middlewares/authMiddleware');
const { checkRole } = require('../middlewares/roleMiddleware');

router.use('/auth', authRoutes);
router.use('/employees', authenticateJWT, checkRole(['Administrador']), employeeRoutes);
router.use('/customers', customerRoutes);
router.use('/suppliers', supplierRoutes);
router.use('/batches', authenticateJWT, checkRole(['Administrador', 'Empleado']), batchRoutes);
router.use('/brand-products', authenticateJWT, checkRole(['Administrador','Empleado']), brandProductRoutes);
router.use('/car-brands', authenticateJWT, checkRole(['Administrador','Empleado']), carBrandRoutes);
router.use('/car-categories', authenticateJWT, checkRole(['Administrador','Empleado']), carCategoryRoutes);
router.use('/car-images', authenticateJWT, checkRole(['Administrador','Empleado']), carImageRoutes);
router.use('/car-lines', authenticateJWT, checkRole(['Administrador','Empleado']), carLineRoutes);
router.use('/cars', authenticateJWT, checkRole(['Administrador','Empleado']), carRoutes);
router.use('/category-products', authenticateJWT, checkRole(['Administrador','Empleado']), categoryProductRoutes);
router.use('/products', authenticateJWT, checkRole(['Administrador','Empleado']), productRoutes);

router.get('/', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: `${config.app.name.toUpperCase()} API running successfully`,
    version: config.app.version,
    environment: config.env
  });
});

module.exports = router;