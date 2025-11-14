const express = require('express');
const router = express.Router();
const { processCampaign, sendQuotationsFollowup } = require('../controllers/campaignController');
const { authenticateJWT } = require('../middlewares/authMiddleware');
const { checkRole } = require('../middlewares/roleMiddleware');


router.post('/webhook', processCampaign);
router.post('/send-quotations-followup', authenticateJWT, checkRole(['Administrador','Empleado']), sendQuotationsFollowup);

module.exports = router;
