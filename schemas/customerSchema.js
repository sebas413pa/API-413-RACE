'use strict';
const Joi = require('joi');

const listCustomersSchema = Joi.object({
    role_id: Joi.number().integer().optional()
});

const createCustomerSchema = Joi.object({
  first_name: Joi.string().max(100).required(),
  last_name: Joi.string().max(100).required(),
  birthday: Joi.date().required(),
  gender: Joi.string().valid('Masculino', 'Femenino', 'Otro'),
  phone: Joi.string().min(8).required(),
  address: Joi.string().min(1).required(),
  role_id: Joi.number().integer().required(),
  username: Joi.string().max(50).required(),
  email: Joi.string().email().max(100).required(),
  city_id: Joi.number().integer()
});

const updateCustomerSchema = Joi.object({
  first_name: Joi.string().max(100).optional(),
  last_name: Joi.string().max(100).optional(),
  gender: Joi.string().valid('Masculino', 'Femenino', 'Otro'),
  phone: Joi.string().min(8).required(),
  address: Joi.string().min(1).required(),
  city_id: Joi.number().integer()
});

const customerIdParamSchema = Joi.number().integer().required();

module.exports = {
    listCustomersSchema,
    createCustomerSchema,
    updateCustomerSchema,
    customerIdParamSchema,
};