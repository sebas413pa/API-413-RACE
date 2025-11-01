const Joi = require('joi')

const saleDetailSchema = Joi.object({
    product_id: Joi.number().integer(),
    quantity: Joi.number().integer(),
})
const saleBaseSchema = Joi.object({
    customer_id: Joi.number().integer(),
    details: Joi.array().items(saleDetailSchema)
})

module.exports = { saleDetailSchema, saleBaseSchema}