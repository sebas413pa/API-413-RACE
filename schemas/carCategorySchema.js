'use strict';
const Joi = require('joi');

const listCarCategoriesSchema = Joi.object({
  status: Joi.boolean().optional(),
  category_name: Joi.string().max(100).optional(),
});

const createCarCategorySchema = Joi.object({
  category_name: Joi.string().max(100).required(),
});

const updateCarCategorySchema = Joi.object({
  category_name: Joi.string().max(100).optional(),
  status: Joi.boolean().optional(),
});

const carCategoryIdParamSchema = Joi.number().integer().required();

module.exports = {
  listCarCategoriesSchema,
  createCarCategorySchema,
  updateCarCategorySchema,
  carCategoryIdParamSchema,
};
