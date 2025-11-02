const express = require('express');
const router = express.Router();
const controller = require('../controllers/promoCodeController');

router.get('/', controller.listPromoCodes);
router.get('/:promo_code_id', controller.getPromoCode);
router.post('/', controller.createPromoCode);
router.put('/:promo_code_id', controller.updatePromoCode);
router.delete('/:promo_code_id', controller.deletePromoCode);
router.patch('/:promo_code_id/assign-customer', controller.assignPromoCodeCustomer);

module.exports = router;
