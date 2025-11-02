'use strict';
const Joi = require('joi');

const listPromoCodesSchema = Joi.object({
  promo_code: Joi.string().trim().max(50).optional(),
  customer_id: Joi.number().integer().optional(),
  status: Joi.boolean().optional(),
  start_date_from: Joi.date().iso().optional(),
  start_date_to: Joi.date().iso().optional(),
  end_date_from: Joi.date().iso().optional(),
  end_date_to: Joi.date().iso().optional(),
});

const createPromoCodeSchema = Joi.object({
  promo_code: Joi.string().trim().min(3).max(50).required(),
  customer_id: Joi.number().integer().required(),
  discount_type: Joi.string().valid('percentage', 'fixed_amount').optional(),
  discount_value: Joi.number().precision(2).positive().required(),
  min_purchase_amount: Joi.number().precision(2).min(0).allow(null).optional(),
  max_discount_amount: Joi.number().precision(2).min(0).allow(null).optional(),
  start_date: Joi.date().iso().required(),
  end_date: Joi.date().iso().min(Joi.ref('start_date')).required(),
  status: Joi.boolean().optional(),
});

const updatePromoCodeSchema = Joi.object({
  promo_code: Joi.string().trim().min(3).max(50).optional(),
  customer_id: Joi.number().integer().optional(),
  discount_type: Joi.string().valid('percentage', 'fixed_amount').optional(),
  discount_value: Joi.number().precision(2).positive().optional(),
  min_purchase_amount: Joi.number().precision(2).min(0).allow(null).optional(),
  max_discount_amount: Joi.number().precision(2).min(0).allow(null).optional(),
  start_date: Joi.date().iso().optional(),
  end_date: Joi.date().iso().optional(),
  status: Joi.boolean().optional(),
}).min(1);

const promoCodeIdParamSchema = Joi.number().integer().required();

const promoCodeAssignSchema = Joi.object({
  customer_id: Joi.number().integer().required(),
}).required();

const promoCodeCustomerParamSchema = Joi.object({
  promo_code_id: Joi.number().integer().required(),
  customer_id: Joi.number().integer().required(),
});

module.exports = {
  listPromoCodesSchema,
  createPromoCodeSchema,
  updatePromoCodeSchema,
  promoCodeIdParamSchema,
  promoCodeAssignSchema,
  promoCodeCustomerParamSchema,
};
