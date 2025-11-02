'use strict';
const Joi = require('joi');

const listProductsSchema = Joi.object({
  status: Joi.boolean().optional(),
  category_product_id: Joi.number().integer().optional(),
  brand_product_id: Joi.number().integer().optional(),
  name: Joi.string().max(150).optional(),
});

const createProductSchema = Joi.object({
  name: Joi.string().max(150).required(),
  description: Joi.string().max(255).allow(null, '').optional(),
  image_url: Joi.string().max(255).allow(null, '').optional(),
  stock: Joi.number().integer().min(0).optional(),
  profit_margin: Joi.number().precision(2).required(),
  purchase_price: Joi.number().precision(2).allow(null).optional(),
  category_product_id: Joi.number().integer().required(),
  brand_product_id: Joi.number().integer().required(),
  status: Joi.boolean().optional(),
});

const updateProductSchema = Joi.object({
  name: Joi.string().max(150).optional(),
  description: Joi.string().max(255).allow(null, '').optional(),
  image_url: Joi.string().max(255).allow(null, '').optional(),
  stock: Joi.number().integer().min(0).optional(),
  profit_margin: Joi.number().precision(2),
  category_product_id: Joi.number().integer().optional(),
  brand_product_id: Joi.number().integer().optional(),
  status: Joi.boolean().optional(),
});

const productIdParamSchema = Joi.number().integer().required();

module.exports = {
  listProductsSchema,
  createProductSchema,
  updateProductSchema,
  productIdParamSchema,
};
