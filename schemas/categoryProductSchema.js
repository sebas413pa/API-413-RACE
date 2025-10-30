'use strict';
const Joi = require('joi');

const listCategoryProductsSchema = Joi.object({
  status: Joi.boolean().optional(),
  category_name: Joi.string().max(100).optional(),
});

const createCategoryProductSchema = Joi.object({
  category_name: Joi.string().max(100).required(),
});

const updateCategoryProductSchema = Joi.object({
  category_name: Joi.string().max(100).optional(),
  status: Joi.boolean().optional(),
});

const categoryProductIdParamSchema = Joi.number().integer().required();

module.exports = {
  listCategoryProductsSchema,
  createCategoryProductSchema,
  updateCategoryProductSchema,
  categoryProductIdParamSchema,
};
