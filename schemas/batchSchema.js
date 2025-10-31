'use strict';
const Joi = require('joi');

const baseBatchSchema = Joi.object({
    product_id: Joi.number().integer().optional().empty(null).empty(''),
    car_id: Joi.number().integer().optional().empty(null).empty(''),
    supplier_id: Joi.number().integer().optional().empty(null).empty(''),
    purchase_id: Joi.number().integer().optional().empty(null).empty(''),
    batch_code: Joi.string().max(150).required(),
    quantity: Joi.number().integer().required().min(0),
}).xor('product_id', 'car_id');

const createBatchSchema = baseBatchSchema;

const listBatchesSchema = Joi.object({
    batch_id: Joi.number().integer().optional(),
    batch_code: Joi.string().optional(),
    car_id: Joi.alternatives()
        .try(Joi.number().integer(), Joi.array().items(Joi.number().integer()))
        .optional()
        .empty('')
        .empty(null),
    product_id: Joi.alternatives()
        .try(Joi.number().integer(), Joi.array().items(Joi.number().integer()))
        .optional()
        .empty('')
        .empty(null),
    supplier_id: Joi.alternatives()
        .try(Joi.number().integer(), Joi.array().items(Joi.number().integer()))
        .optional()
        .empty('')
        .empty(null),
    purchase_id: Joi.number().integer().optional(),
    start_date: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).optional(),
    end_date: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).optional(),
    date_field: Joi.string().valid('received_at', 'createdAt', 'updatedAt').optional(),
})

module.exports = {createBatchSchema, listBatchesSchema}