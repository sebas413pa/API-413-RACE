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
const PAYMENT_METHODS = [
    'Tarjeta de Credito',
    'Tarjeta de Debito',
    'Transferencia Bancaria',
    'Efectivo',
    'PayPal',
    'Otro'
];

const SALE_STATUS_VALUES = [
    'Pendiente',
    'Enviada',
    'Completada',
    'Cancelada'
];

const saleDetailSchema = Joi.object({
    product_id: Joi.number().integer().required(),
    quantity: Joi.number().integer().positive().required(),
});

const paymentSchema = Joi.object({
    payment_method: Joi.string().valid(...PAYMENT_METHODS).required(),
    amount: Joi.number().precision(2).positive().required(),
    transaction_id: Joi.string().max(100).allow(null, '').optional(),
    notes: Joi.string().max(500).allow(null, '').optional(),
});

const saleBaseSchema = Joi.object({
    promo_code: Joi.string().trim().min(1).max(50).optional(),
    payment: paymentSchema.required(),
    details: Joi.array().items(saleDetailSchema).min(1).required(),
});

const saleStatusSchema = Joi.object({
    status: Joi.string().valid(...SALE_STATUS_VALUES).required(),
});

module.exports = { saleDetailSchema, saleBaseSchema, listSchema, saleStatusSchema, SALE_STATUS_VALUES }