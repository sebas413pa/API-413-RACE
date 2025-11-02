const Joi = require('joi')

const purchaseDetailBaseSchema = Joi.object({
    product_id: Joi.number().integer(),
    car_id: Joi.number().integer(),
    quantity: Joi.number().integer().required(),
    unit_price: Joi.number().precision(2).required(),
    batch_code: Joi.string().required()
    
}).xor('product_id', 'car_id');

const purchaseBaseSchema = new Joi.object({
    supplier_id: Joi.number().integer().required(),
    purchase_date: Joi.date().required(),
    details: Joi.array().items(purchaseDetailBaseSchema)
})

const listPurchaseSchema = Joi.object({
    purchase_id: Joi.number().integer(),
    car_id: Joi.alternatives().try(
        Joi.number().integer(),
        Joi.array().items(Joi.number().integer())
    ),
    product_id: Joi.alternatives().try(
        Joi.number().integer(),
        Joi.array().items(Joi.number().integer)
    ),
    supplier_id: Joi.number().integer(),
    start_date: Joi.date(),
    end_date: Joi.date()
})

module.exports = {purchaseBaseSchema, purchaseDetailBaseSchema, listPurchaseSchema}