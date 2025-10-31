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

const usernameParamSchema = Joi.string().max(150).required();

const changeOwnPasswordSchema = Joi.object({
   newPassword: Joi.string()
      .min(8)
      .max(50)
      .pattern(/[A-Z]/, "una mayúscula")
      .pattern(/[a-z]/, "una minúscula")
      .pattern(/[0-9]/, "un número")
      .pattern(/[^A-Za-z0-9]/, "un carácter especial")
      .required()
      .messages({
        "string.pattern.name":
          "La contraseña debe incluir al menos {#name}.",
        "string.min": "La contraseña debe tener al menos 8 caracteres.",
        "any.required": "La contraseña es obligatoria.",
      }),
})
module.exports = {
    listEmployeeSchema,
    createEmployeeSchema,
    updateEmployeeSchema,
    usernameParamSchema,
    changeOwnPasswordSchema,
    employeeIdParamSchema,
};