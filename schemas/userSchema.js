const Joi = require("joi");

const createUser = Joi.object({
  user_id: Joi.number()
    .integer()
    .min(1)
    .optional(),

  role_id: Joi.number()
    .integer()
    .required()
    .messages({
      "number.base": "El ID del rol debe ser un número.",
      "any.required": "El ID del rol es obligatorio.",
    }),

  username: Joi.string()
    .alphanum()
    .min(3)
    .max(50)
    .required()
    .messages({
      "string.base": "El nombre de usuario debe ser texto.",
      "string.alphanum": "El nombre de usuario solo puede contener letras y números.",
      "string.empty": "El nombre de usuario no puede estar vacío.",
      "any.required": "El nombre de usuario es obligatorio.",
    }),

  email: Joi.string()
    .email()
    .max(100)
    .required()
    .messages({
      "string.email": "Debe ingresar un correo válido.",
      "any.required": "El correo es obligatorio.",
    }),

  password: Joi.string()
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

module.exports = { createUser }
