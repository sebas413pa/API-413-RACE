const express = require('express');
const router = express.Router();
const { processCampaign } = require('../controllers/campaignController');


router.post('/webhook', processCampaign);

module.exports = router;
