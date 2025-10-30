'use strict';
const Joi = require('joi');

const listEmployeeSchema = Joi.object({
    role_id: Joi.number().integer().optional()
});

const createEmployeeSchema = Joi.object({
  first_name: Joi.string().max(100).required(),
  last_name: Joi.string().max(100).required(),
  hire_date: Joi.date().optional(),
  salary: Joi.number().positive().precision(2).optional(),
  role_id: Joi.number().integer().required(),
  username: Joi.string().max(50).required(),
  email: Joi.string().email().max(100).required(),
});

const updateEmployeeSchema = Joi.object({
  first_name: Joi.string().max(100).optional(),
  last_name: Joi.string().max(100).optional(),
  hire_date: Joi.date().optional(),
  salary: Joi.number().positive().precision(2).optional(),
  status: Joi.boolean().optional(),
});

const employeeIdParamSchema = Joi.number().integer().required();

module.exports = {
    listEmployeeSchema,
    createEmployeeSchema,
    updateEmployeeSchema,
    employeeIdParamSchema,
};