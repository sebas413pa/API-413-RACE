'use strict';
const Joi = require('joi');

const listBrandProductsSchema = Joi.object({
  status: Joi.boolean().optional(),
  brand_name: Joi.string().max(100).optional(),
  page: Joi.number().integer().min(1).optional(),
  limit: Joi.number().integer().min(1).optional(),
});

const createBrandProductSchema = Joi.object({
  brand_name: Joi.string().max(100).required(),
});

const updateBrandProductSchema = Joi.object({
  brand_name: Joi.string().max(100).optional(),
  status: Joi.boolean().optional(),
});

const brandProductIdParamSchema = Joi.number().integer().required();

module.exports = {
  listBrandProductsSchema,
  createBrandProductSchema,
  updateBrandProductSchema,
  brandProductIdParamSchema,
};
