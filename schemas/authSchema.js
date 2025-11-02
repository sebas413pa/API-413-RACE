const Joi = require("joi");

const loginUser = Joi.object({
  username: Joi.string().required().messages({
    "any.required": "El nombre de usuario es obligatorio",
  }),
  password: Joi.string().required().messages({
    "any.required": "La contraseña es obligatoria",
  }),
});

module.exports = { loginUser }
