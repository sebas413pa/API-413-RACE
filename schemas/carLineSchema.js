'use strict';
const Joi = require('joi');

const listCarLinesSchema = Joi.object({
  status: Joi.boolean().optional(),
  line_name: Joi.string().max(100).optional(),
  brand_id: Joi.number().integer().optional(),
  category_id: Joi.number().integer().optional(),
});

const createCarLineSchema = Joi.object({
  brand_id: Joi.number().integer().required(),
  category_id: Joi.number().integer().required(),
  line_name: Joi.string().max(100).required(),
});

const updateCarLineSchema = Joi.object({
  brand_id: Joi.number().integer().optional(),
  category_id: Joi.number().integer().optional(),
  line_name: Joi.string().max(100).optional(),
  status: Joi.boolean().optional(),
});

const carLineIdParamSchema = Joi.number().integer().required();

module.exports = {
  listCarLinesSchema,
  createCarLineSchema,
  updateCarLineSchema,
  carLineIdParamSchema,
};
