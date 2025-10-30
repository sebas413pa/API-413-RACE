const express = require('express');
const router = express.Router();
const controller = require('../controllers/carController');
const { authenticateJWT } = require('../middlewares/authMiddleware');
const { checkRole } = require('../middlewares/roleMiddleware');
const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
	destination: function (req, file, cb) {
		cb(null, path.join(__dirname, '..', 'uploads', 'cars'));
	},
	filename: function (req, file, cb) {
		const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
		const ext = path.extname(file.originalname);
		cb(null, `${unique}${ext}`);
	}
});
const upload = multer({ storage });

router.get('/', authenticateJWT, checkRole(['Administrador','Empleado']), controller.listCars);
router.post(
	'/',
	authenticateJWT,
	checkRole(['Administrador', 'Empleado']),
		upload.any(),
	controller.createCar
);
router.put(
	'/:car_id',
	authenticateJWT,
	checkRole(['Administrador', 'Empleado']),
		upload.any(),
	controller.updateCar
);
router.patch('/activate/:car_id', authenticateJWT, checkRole(['Administrador','Empleado']), controller.activateCar);
router.delete('/:car_id', authenticateJWT, checkRole(['Administrador','Empleado']), controller.deactivateCar);

module.exports = router;
