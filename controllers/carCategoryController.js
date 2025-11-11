'use strict';
const { models } = require('../db');
const { car_categories: CarCategory } = models;
const logger = require('../utils/logger');
const ApiResponse = require('../utils/apiResponse');
const { listCarCategoriesSchema, createCarCategorySchema, updateCarCategorySchema, carCategoryIdParamSchema } = require('../schemas/carCategorySchema');
const { Op } = require('sequelize');
const { default: api } = require('../utils/apiClient');

const listCarCategories = async (req, res) => {
  const response = new ApiResponse();
  const { error, value } = listCarCategoriesSchema.validate(req.query);
  if (error) return res.status(400).json(response.errorResponse('Parámetros inválidos', error.details));
  const { status, category_name } = value;
  try {
    
    const where = {};
    if (typeof status !== 'undefined') where.status = status;
    if (category_name) where.category_name = { [Op.like]: `%${category_name}%` };
    const items = await CarCategory.findAll({ where });
    return res.status(200).json(response.successResponse(items, 'Car categories obtenidos'));
  } catch (err) {
    logger.error('Error al listar car_categories', err);
    return res.status(500).json(response.errorResponse('Error al listar car_categories', err));
  }
};

const createCarCategory = async (req, res) => {
  const response = new ApiResponse();
  const { error, value } = createCarCategorySchema.validate(req.body);
  if (error) return res.status(400).json(response.errorResponse('Datos inválidos', error.details));
      const t = await sequelize.transaction();
  try {
    
    const item = await CarCategory.create(value);
    const crmItem = await api.post('/categories', {
      category_id: item.car_category_id,
      category_name: item.category_name
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
    return res.status(201).json(response.successResponse(item, 'Car category creado'));
  } catch (err) {
    logger.error('Error al crear car_category', err);
    return res.status(500).json(response.errorResponse('Error al crear car_category', err));
  }
};

const updateCarCategory = async (req, res) => {
  const response = new ApiResponse();
  const { car_category_id } = req.params;
  const paramResult = carCategoryIdParamSchema.validate(car_category_id);
  if (paramResult.error) return res.status(400).json(response.errorResponse('ID inválido', paramResult.error.details));
  const { error, value } = updateCarCategorySchema.validate(req.body);
  if (error) return res.status(400).json(response.errorResponse('Datos inválidos', error.details));
  try {
    const item = await CarCategory.findByPk(car_category_id);
    if (!item) return res.status(404).json(response.errorResponse('No encontrado'));
    const updated = await item.update(value);
    return res.status(200).json(response.successResponse(updated, 'Car category actualizado'));
  } catch (err) {
    logger.error('Error al actualizar car_category', err);
    return res.status(500).json(response.errorResponse('Error al actualizar car_category', err));
  }
};

const deactivateCarCategory = async (req, res) => {
  const response = new ApiResponse();
  const { car_category_id } = req.params;
  try {
    const item = await CarCategory.findByPk(car_category_id);
    if (!item) return res.status(404).json(response.errorResponse('No encontrado'));
    item.status = false;
    await item.save();
    return res.status(200).json(response.successResponse(null, 'Car category desactivado'));
  } catch (err) {
    logger.error('Error al desactivar car_category', err);
    return res.status(500).json(response.errorResponse('Error al desactivar car_category', err));
  }
};

const activateCarCategory = async (req, res) => {
  const response = new ApiResponse();
  const { car_category_id } = req.params;
  try {
    const item = await CarCategory.findByPk(car_category_id);
    if (!item) return res.status(404).json(response.errorResponse('No encontrado'));
    item.status = true;
    await item.save();
    return res.status(200).json(response.successResponse(null, 'Car category activado'));
  } catch (err) {
    logger.error('Error al activar car_category', err);
    return res.status(500).json(response.errorResponse('Error al activar car_category', err));
  }
};

module.exports = { listCarCategories, createCarCategory, updateCarCategory, deactivateCarCategory, activateCarCategory };
