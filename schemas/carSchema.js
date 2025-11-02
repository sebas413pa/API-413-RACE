'use strict';
const Joi = require('joi');

const listCarsSchema = Joi.object({
  status: Joi.boolean().optional(),
  line_id: Joi.number().integer().optional(),
  model: Joi.number().integer().optional(),
});

const createCarSchema = Joi.object({
  line_id: Joi.number().integer().required(),
  color: Joi.string().max(100).required(),
  engine_capacity: Joi.number().precision(2).required(),
  type_car: Joi.string().valid('Electrico','Gasolina','Hibrido').optional(),
  transmission: Joi.string().valid('Manual','Automatica').optional(),
  model: Joi.number().integer().required(),
  purchase_price: Joi.number().precision(2).required(),
  stock: Joi.number().integer().optional(),
  profit_margin: Joi.number().precision(2).required()
});

const updateCarSchema = Joi.object({
  line_id: Joi.number().integer().optional(),
  color: Joi.string().max(100).optional(),
  engine_capacity: Joi.number().precision(2).optional(),
  type_car: Joi.string().valid('Electrico','Gasolina','Hibrido').optional(),
  transmission: Joi.string().valid('Manual','Automatica').optional(),
  model: Joi.number().integer().optional(),
  stock: Joi.number().integer().optional(),
  status: Joi.boolean().optional(),
  profit_margin: Joi.number().precision(2).optional()
});

const carIdParamSchema = Joi.number().integer().required();

module.exports = {
  listCarsSchema,
  createCarSchema,
  updateCarSchema,
  carIdParamSchema,
};
