'use strict';
const { models } = require('../db');
const { batches: Batch } = models;
const logger = require('../utils/logger');
const ApiResponse = require('../utils/apiResponse');
const { listBatchesSchema } = require('../schemas/batchSchema');

const listBatches = async (req, res) => {
  const response = new ApiResponse();
  const { error, value } = listBatchesSchema.validate(req.query);
  if (error) return res.status(400).json(response.errorResponse('Parámetros inválidos', error.details));

  const {
    batch_id,
    batch_code,
    car_id,
    product_id,
    supplier_id,
    purchase_id,
    start_date,
    end_date,
    date_field = 'received_at',
  } = value;
  try {
    const { Op } = require('sequelize');
    const where = {};
    const inArray = (val) => (Array.isArray(val) ? { [Op.in]: val } : val);

    if (batch_id) where.batch_id = batch_id;
    if (batch_code) where.batch_code = { [Op.like]: `%${batch_code}%` };
    if (car_id) where.car_id = inArray(car_id);
    if (product_id) where.product_id = inArray(product_id);
    if (supplier_id) where.supplier_id = inArray(supplier_id);
    if (purchase_id) where.purchase_id = purchase_id;

    if (start_date || end_date) {
      const field = date_field || 'received_at';
      where[field] = {};
      if (start_date) where[field][Op.gte] = start_date;
      if (end_date) where[field][Op.lte] = end_date;
    }

    const batches = await Batch.findAll({ where });
    return res.status(200).json(response.successResponse(batches, 'Lotes obtenidos exitosamente'));
  } catch (err) {
    logger.error('Error al listar lotes', err);
    return res.status(500).json(response.errorResponse('Error al listar lotes', err));
  }
};

module.exports = { listBatches };
