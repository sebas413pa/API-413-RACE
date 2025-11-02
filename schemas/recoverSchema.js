const Joi = require("joi");

const resetPasswordSchema = Joi.object({
  token: Joi.string().required().messages({
    "any.required": "El token es obligatorio.",
  }),
  newPassword: Joi.string()
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
      "any.required": "La contraseña es obligatoria.",
    }),
});

module.exports = { resetPasswordSchema };