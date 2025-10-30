'use strict';
const Joi = require('joi');

const listSuppliersSchema = Joi.object({
    status: Joi.boolean().optional(),
    supplier_name: Joi.string().max(150).optional(),
    page: Joi.number().integer().min(1).optional(),
    limit: Joi.number().integer().min(1).optional(),
});

const createSupplierSchema = Joi.object({
    supplier_name: Joi.string().max(150).required(),
    contact_name: Joi.string().max(100).optional(),
    phone: Joi.string().max(20).optional(),
    email: Joi.string().email().max(100).optional(),
    address: Joi.string().max(255).optional(),
});

const updateSupplierSchema = Joi.object({
    supplier_name: Joi.string().max(150).optional(),
    contact_name: Joi.string().max(100).optional(),
    phone: Joi.string().max(20).optional(),
    email: Joi.string().email().max(100).optional(),
    address: Joi.string().max(255).optional(),
    status: Joi.boolean().optional(),
});

const supplierIdParamSchema = Joi.number().integer().required();

module.exports = {
    listSuppliersSchema,
    createSupplierSchema,
    updateSupplierSchema,
    supplierIdParamSchema,
};