const express = require('express');
const { authenticateJWT } = require('../middlewares/authMiddleware');
const { authenticateRefresh } = require('../middlewares/refreshMiddleware');
const { authenticateLogout } = require('../middlewares/logoutMiddleware');
const authController = require('../controllers/authController');

const router = express.Router();

// router.post('/login', authController.login);
router.post('/refresh', authenticateRefresh, authController.refresh);
router.post('/logout', authenticateLogout, authController.logout);
router.post('/login/google', authController.googleLogin);
router.get('/me', authenticateJWT, authController.getMe);

module.exports = router;