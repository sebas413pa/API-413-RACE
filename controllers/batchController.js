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

  const { start_date, end_date, date_field = 'received_at' } = value;
  try {
    const { Op } = require('sequelize');
    const where = {};

    if (start_date && end_date) {
      where[date_field] = { [Op.between]: [start_date, end_date] };
    } else if (start_date) {
      where[date_field] = { [Op.gte]: start_date };
    } else if (end_date) {
      where[date_field] = { [Op.lte]: end_date };
    }

    const batches = await Batch.findAll({ where });
    return res.status(200).json(response.successResponse(batches, 'Lotes obtenidos exitosamente'));
  } catch (err) {
    logger.error('Error al listar lotes', err);
    return res.status(500).json(response.errorResponse('Error al listar lotes', err));
  }
};

module.exports = { listBatches };
