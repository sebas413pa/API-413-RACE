const Joi = require('joi');

const QUOTATION_STATUS_VALUES = [
    'Pendiente',
    'Aprobada',
    'Rechazada',
    'Completada'
];

const createQuotationSchema = Joi.object({
    customer_id: Joi.number().integer().positive().optional(),
    car_id: Joi.number().integer().positive().required(),
    total: Joi.number().precision(2).positive().optional(),
    is_active: Joi.boolean().optional()
});

const listQuotationSchema = Joi.object({
    quotation_id: Joi.number().integer(),
    customer_id: Joi.number().integer(),
    car_id: Joi.number().integer(),
    status: Joi.string().valid(...QUOTATION_STATUS_VALUES),
    is_active: Joi.boolean()
});

const quotationStatusSchema = Joi.object({
    status: Joi.string().valid(...QUOTATION_STATUS_VALUES).required()
});

module.exports = {
    createQuotationSchema,
    listQuotationSchema,
    quotationStatusSchema,
    QUOTATION_STATUS_VALUES
};
