'use strict';
const Joi = require('joi');

const listPromotionsSchema = Joi.object({
  status: Joi.boolean().optional(),
  promotion_name: Joi.string().trim().max(255).optional(),
  start_date_from: Joi.date().iso().optional(),
  start_date_to: Joi.date().iso().optional(),
  end_date_from: Joi.date().iso().optional(),
  end_date_to: Joi.date().iso().optional(),
});

const createPromotionSchema = Joi.object({
  promotion_name: Joi.string().trim().min(1).max(255).required(),
  discount_type: Joi.string().valid('percentage', 'fixed_amount').optional(),
  discount_value: Joi.number().precision(2).positive().required(),
  start_date: Joi.date().iso().required(),
  end_date: Joi.date().iso().min(Joi.ref('start_date')).required(),
  status: Joi.boolean().optional(),
});

const updatePromotionSchema = Joi.object({
  promotion_name: Joi.string().trim().min(1).max(255).optional(),
  discount_type: Joi.string().valid('percentage', 'fixed_amount').optional(),
  discount_value: Joi.number().precision(2).positive().optional(),
  start_date: Joi.date().iso().optional(),
  end_date: Joi.date().iso().optional(),
  status: Joi.boolean().optional(),
});

const promotionIdParamSchema = Joi.number().integer().required();

const assignPromotionTargetSchema = Joi.object({
  product_id: Joi.number().integer().optional(),
  car_id: Joi.number().integer().optional(),
})
  .xor('product_id', 'car_id')
  .messages({ 'object.xor': 'Debe proporcionar product_id o car_id, pero no ambos.' });

const promotionProductIdParamSchema = Joi.number().integer().required();

module.exports = {
  listPromotionsSchema,
  createPromotionSchema,
  updatePromotionSchema,
  promotionIdParamSchema,
  assignPromotionTargetSchema,
  promotionProductIdParamSchema,
};
