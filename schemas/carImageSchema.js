'use strict';
const Joi = require('joi');

const listCarImagesSchema = Joi.object({
  status: Joi.boolean().optional(),
  car_id: Joi.number().integer().optional(),
});

const createCarImageSchema = Joi.object({
  car_id: Joi.number().integer().required(),
  image_url: Joi.string().uri().max(255).optional(),
  is_main: Joi.boolean().optional(),
});

const updateCarImageSchema = Joi.object({
  image_url: Joi.string().uri().max(255).optional(),
  is_main: Joi.boolean().optional(),
  status: Joi.boolean().optional(),
});

const carImageIdParamSchema = Joi.number().integer().required();

module.exports = {
  listCarImagesSchema,
  createCarImageSchema,
  updateCarImageSchema,
  carImageIdParamSchema,
};
