const Joi = require('joi')

const listSchema = Joi.object({
    sale_id: Joi.number().integer(),
    car_id: Joi.alternatives().try(
        Joi.number().integer(),
        Joi.array().items(Joi.number().integer())
    ),
    product_id: Joi.alternatives().try(
        Joi.number().integer(),
        Joi.array().items(Joi.number().integer())
    ),
    customer_id: Joi.number().integer(),
    start_date: Joi.date(),
    end_date: Joi.date(),
    active: Joi.string().valid("Pendiente", "Enviada", "Completada", "Cancelada")
})
const saleDetailSchema = Joi.object({
    product_id: Joi.number().integer().required(),
    quantity: Joi.number().integer().positive().required(),
})
const saleBaseSchema = Joi.object({
    promo_code: Joi.string().trim().min(1).max(50).optional(),
    details: Joi.array().items(saleDetailSchema).min(1).required()
})

module.exports = { saleDetailSchema, saleBaseSchema, listSchema}