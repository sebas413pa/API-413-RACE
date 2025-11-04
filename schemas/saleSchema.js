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

const CARD_REQUIRED_METHODS = ['Tarjeta de Credito', 'Tarjeta de Debito'];

const SALE_STATUS_VALUES = [
    'Pendiente',
    'Enviada',
    'Completada',
    'Cancelada'
];

const saleDetailSchema = Joi.object({
    product_id: Joi.number().integer().positive().required(),
    quantity: Joi.number().integer().positive().required(),
});

const carSaleDetailSchema = Joi.object({
    car_id: Joi.number().integer().positive().required(),
    sale_price: Joi.number().precision(2).optional(),
    quantity: Joi.number().integer().positive().default(1),
});

const cardNumberSchema = Joi.string()
    .trim()
    .replace(/\s+/g, '')
    .pattern(/^\d{12,19}$/)
    .messages({
        'string.pattern.base': 'El número de tarjeta debe contener entre 12 y 19 dígitos',
    });

const paymentSchema = Joi.object({
    payment_method: Joi.string().valid(...PAYMENT_METHODS).required(),
    amount: Joi.number().precision(2).min(0).optional().strip(),
    card_number: Joi.alternatives().conditional('payment_method', {
        is: Joi.valid(...CARD_REQUIRED_METHODS),
        then: cardNumberSchema.required(),
        otherwise: Joi.any().strip(),
    }),
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

const carSaleSchema = Joi.object({
    customer_id: Joi.number().integer().positive().required(),
    quotation_id: Joi.number().integer().positive().optional(),
    promo_code: Joi.string().trim().min(1).max(50).optional(),
    payment: paymentSchema.required(),
    details: Joi.array().items(carSaleDetailSchema).length(1).required(),
});

module.exports = { saleDetailSchema, saleBaseSchema, listSchema, saleStatusSchema, SALE_STATUS_VALUES, carSaleSchema }