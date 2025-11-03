const express = require('express');
const router = express.Router();
const controller = require('../controllers/carImageController');
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

router.get('/', controller.listCarImages);
router.post('/', authenticateJWT, checkRole(['Administrador','Empleado']), upload.array('images', 10), controller.createCarImage);
router.put('/:car_image_id', authenticateJWT, checkRole(['Administrador','Empleado']), upload.single('image'), controller.updateCarImage);
router.patch('/activate/:car_image_id', authenticateJWT, checkRole(['Administrador','Empleado']), controller.activateCarImage);
router.delete('/:car_image_id', authenticateJWT, checkRole(['Administrador','Empleado']), controller.deactivateCarImage);

module.exports = router;
