const express = require('express');
const router = express.Router();
const controller = require('../controllers/promotionController');

router.get('/', controller.listPromotions);
router.post('/', controller.createPromotion);
router.put('/:promotion_id', controller.updatePromotion);
router.patch('/activate/:promotion_id', controller.activatePromotion);
router.patch('/deactivate/:promotion_id', controller.deactivatePromotion);
router.post('/:promotion_id/targets', controller.assignPromotionTarget);
router.delete('/:promotion_id/targets/:promotion_product_id', controller.removePromotionTarget);

module.exports = router;
