const Joi = require('joi');

const QUOTATION_STATUS_VALUES = [
    'Pendiente',
    'Aprobada',
    'Rechazada',
    'Completada'
];

const createQuotationSchema = Joi.object({
    car_id: Joi.number().integer().positive().required()
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
