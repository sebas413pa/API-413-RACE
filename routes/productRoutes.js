const express = require('express');
const router = express.Router();
const controller = require('../controllers/productController');
const { authenticateJWT } = require('../middlewares/authMiddleware');
const { checkRole } = require('../middlewares/roleMiddleware');
const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
	destination: function (req, file, cb) {
		cb(null, path.join(__dirname, '..', 'uploads', 'products'));
	},
	filename: function (req, file, cb) {
		const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
		const ext = path.extname(file.originalname);
		cb(null, `${unique}${ext}`);
	}
});
const upload = multer({ storage });
const productUpload = upload.fields([
	{ name: 'image', maxCount: 1 },
	{ name: 'file', maxCount: 1 },
	{ name: 'product_image', maxCount: 1 }
]);

router.get('/', authenticateJWT, checkRole(['Administrador','Empleado']), controller.listProducts);
router.get('/catalog', controller.listCatalogProducts);
router.post('/', authenticateJWT, checkRole(['Administrador','Empleado']), productUpload, controller.createProduct);
router.put('/:product_id', authenticateJWT, checkRole(['Administrador','Empleado']), productUpload, controller.updateProduct);
router.patch('/activate/:product_id', authenticateJWT, checkRole(['Administrador','Empleado']), controller.activateProduct);
router.patch('/deactivate/:product_id', authenticateJWT, checkRole(['Administrador','Empleado']), controller.deactivateProduct);

module.exports = router;
