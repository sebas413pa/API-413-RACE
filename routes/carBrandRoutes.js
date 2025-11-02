const express = require('express');
const router = express.Router();
const controller = require('../controllers/carBrandController');
const { authenticateJWT } = require('../middlewares/authMiddleware');
const { checkRole } = require('../middlewares/roleMiddleware');
const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
	destination: function(req, file, cb) {
		cb(null, path.join(__dirname, '..', 'uploads', 'car-brands'));
	},
	filename: function(req, file, cb) {
		const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
		const ext = path.extname(file.originalname);
		cb(null, `${unique}${ext}`);
	}
});

const upload = multer({ storage });

router.get('/', authenticateJWT, checkRole(['Administrador','Empleado']), controller.listCarBrands);
router.post('/', authenticateJWT, checkRole(['Administrador','Empleado']), upload.single('image'), controller.createCarBrand);
router.put('/:brand_id', authenticateJWT, checkRole(['Administrador','Empleado']), upload.single('image'), controller.updateCarBrand);
router.patch('/activate/:brand_id', authenticateJWT, checkRole(['Administrador','Empleado']), controller.activateCarBrand);
router.patch('/deactivate/:brand_id', authenticateJWT, checkRole(['Administrador','Empleado']), controller.deactivateCarBrand);

module.exports = router;
