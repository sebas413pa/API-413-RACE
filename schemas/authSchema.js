const Joi = require("joi");

const loginUser = Joi.object({
  username: Joi.string()
    .alphanum()
    .min(3)
    .max(50)
    .required()
    .messages({
      "string.base": "El nombre de usuario debe ser texto.",
      "string.alphanum": "El nombre de usuario solo puede contener letras y números.",
      "string.empty": "El nombre de usuario no puede estar vacío.",
      "string.min": "El nombre de usuario debe tener al menos 3 caracteres.",
      "string.max": "El nombre de usuario no puede exceder 50 caracteres.",
      "any.required": "El nombre de usuario es obligatorio.",
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
      "string.pattern.name": "La contraseña debe incluir al menos {#name}.",
      "string.min": "La contraseña debe tener al menos 8 caracteres.",
      "string.max": "La contraseña no puede exceder 50 caracteres.",
      "string.empty": "La contraseña no puede estar vacía.",
      "any.required": "La contraseña es obligatoria.",
    }),
});

module.exports = { loginUser }
