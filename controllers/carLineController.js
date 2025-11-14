'use strict';
const { models, sequelize } = require('../db');
const { car_lines: CarLine } = models;
const logger = require('../utils/logger');
const ApiResponse = require('../utils/apiResponse');
const { listCarLinesSchema, createCarLineSchema, updateCarLineSchema, carLineIdParamSchema } = require('../schemas/carLineSchema');
const { default: api } = require('../utils/apiClient');

const listCarLines = async (req, res) => {
  const response = new ApiResponse();
  const { error, value } = listCarLinesSchema.validate(req.query);
  if (error) return res.status(400).json(response.errorResponse('Parámetros inválidos', error.details));
  const { status, line_name, brand_id, category_id } = value;
  try {
    const { Op } = require('sequelize');
    const where = {};
    if (typeof status !== 'undefined') where.status = status;
    if (line_name) where.line_name = { [Op.like]: `%${line_name}%` };
    if (brand_id) where.brand_id = brand_id;
    if (category_id) where.category_id = category_id;
    const items = await CarLine.findAll({ where });
    return res.status(200).json(response.successResponse(items, 'Car lines obtenidos'));
  } catch (err) {
    logger.error('Error al listar car_lines', err);
    return res.status(500).json(response.errorResponse('Error al listar car_lines', err));
  }
};

const createCarLine = async (req, res) => {
  const accessToken = req.cookies?.accessToken;
  const refreshToken = req.cookies?.refreshToken;
  const response = new ApiResponse();
  const { error, value } = createCarLineSchema.validate(req.body);
  if (error) return res.status(400).json(response.errorResponse('Datos inválidos', error.details));
  
    const t = await sequelize.transaction();
  try {
    const item = await CarLine.create(value);
    const crmItem = await api.post('/lines', {
      line_id: item.line_id,
      brand_id: item.brand_id,
      category_id: item.category_id,
      line_name: item.line_name,
    },{
      cookies: {
    accessToken,
    refreshToken
  }
    })

    if (!crmItem.data.success) {
        await t.rollback();

        return res.status(400).json(
          response.errorResponse(
            'No se pudo sincronizar con el CRM',
            crmResp.data
          )
      )
    }
    await t.commit();
    return res.status(201).json(response.successResponse(item, 'Car line creado'));
  } catch (err) {
    logger.error('Error al crear car_line', err);
    return res.status(500).json(response.errorResponse('Error al crear car_line', err));
  }
};

const updateCarLine = async (req, res) => {
  const response = new ApiResponse();
  const { line_id } = req.params;
  const paramResult = carLineIdParamSchema.validate(line_id);
  if (paramResult.error) return res.status(400).json(response.errorResponse('ID inválido', paramResult.error.details));
  const { error, value } = updateCarLineSchema.validate(req.body);
  if (error) return res.status(400).json(response.errorResponse('Datos inválidos', error.details));
  try {
    const item = await CarLine.findByPk(line_id);
    if (!item) return res.status(404).json(response.errorResponse('No encontrado'));
    const updated = await item.update(value);
    return res.status(200).json(response.successResponse(updated, 'Car line actualizado'));
  } catch (err) {
    logger.error('Error al actualizar car_line', err);
    return res.status(500).json(response.errorResponse('Error al actualizar car_line', err));
  }
};

const deactivateCarLine = async (req, res) => {
  const response = new ApiResponse();
  const { line_id } = req.params;
  try {
    const item = await CarLine.findByPk(line_id);
    if (!item) return res.status(404).json(response.errorResponse('No encontrado'));
    item.status = false;
    await item.save();
    return res.status(200).json(response.successResponse(null, 'Car line desactivado'));
  } catch (err) {
    logger.error('Error al desactivar car_line', err);
    return res.status(500).json(response.errorResponse('Error al desactivar car_line', err));
  }
};

const activateCarLine = async (req, res) => {
  const response = new ApiResponse();
  const { line_id } = req.params;
  try {
    const item = await CarLine.findByPk(line_id);
    if (!item) return res.status(404).json(response.errorResponse('No encontrado'));
    item.status = true;
    await item.save();
    return res.status(200).json(response.successResponse(null, 'Car line activado'));
  } catch (err) {
    logger.error('Error al activar car_line', err);
    return res.status(500).json(response.errorResponse('Error al activar car_line', err));
  }
};

module.exports = { listCarLines, createCarLine, updateCarLine, deactivateCarLine, activateCarLine };
