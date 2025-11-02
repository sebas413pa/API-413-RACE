'use strict';
const Joi = require('joi');

const listCarBrandsSchema = Joi.object({
  status: Joi.boolean().optional(),
  brand_name: Joi.string().max(100).optional(),
});

const createCarBrandSchema = Joi.object({
  brand_name: Joi.string().max(100).required(),
  status: Joi.boolean().optional(),
  image_url: Joi.string().max(255).allow(null, '').optional(),
});

const updateCarBrandSchema = Joi.object({
  brand_name: Joi.string().max(100).optional(),
  status: Joi.boolean().optional(),
  image_url: Joi.string().max(255).allow(null, '').optional(),
});

const carBrandIdParamSchema = Joi.number().integer().required();

module.exports = {
  listCarBrandsSchema,
  createCarBrandSchema,
  updateCarBrandSchema,
  carBrandIdParamSchema,
};
