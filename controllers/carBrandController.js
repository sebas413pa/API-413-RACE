'use strict';
const { models } = require('../db');
const { car_brands: CarBrand } = models;
const logger = require('../utils/logger');
const ApiResponse = require('../utils/apiResponse');
const { listCarBrandsSchema, createCarBrandSchema, updateCarBrandSchema, carBrandIdParamSchema } = require('../schemas/carBrandSchema');

const listCarBrands = async (req, res) => {
  const response = new ApiResponse();
  const { error, value } = listCarBrandsSchema.validate(req.query);
  if (error) return res.status(400).json(response.errorResponse('Parámetros inválidos', error.details));
  const { status, brand_name } = value;
  try {
    const { Op } = require('sequelize');
    const where = {};
    if (typeof status !== 'undefined') where.status = status;
    if (brand_name) where.brand_name = { [Op.like]: `%${brand_name}%` };
    const items = await CarBrand.findAll({ where });
    return res.status(200).json(response.successResponse(items, 'Car brands obtenidos exitosamente'));
  } catch (err) {
    logger.error('Error al listar car_brands', err);
    return res.status(500).json(response.errorResponse('Error al listar car_brands', err));
  }
};

const createCarBrand = async (req, res) => {
  const response = new ApiResponse();
  const { error, value } = createCarBrandSchema.validate(req.body);
  if (error) return res.status(400).json(response.errorResponse('Datos inválidos', error.details));
  try {
    const item = await CarBrand.create(value);
    return res.status(201).json(response.successResponse(item, 'Car brand creado'));
  } catch (err) {
    logger.error('Error al crear car_brand', err);
    return res.status(500).json(response.errorResponse('Error al crear car_brand', err));
  }
};

const updateCarBrand = async (req, res) => {
  const response = new ApiResponse();
  const { brand_id } = req.params;
  const paramResult = carBrandIdParamSchema.validate(brand_id);
  if (paramResult.error) return res.status(400).json(response.errorResponse('ID inválido', paramResult.error.details));
  const { error, value } = updateCarBrandSchema.validate(req.body);
  if (error) return res.status(400).json(response.errorResponse('Datos inválidos', error.details));
  try {
    const item = await CarBrand.findByPk(brand_id);
    if (!item) return res.status(404).json(response.errorResponse('No encontrado'));
    const updated = await item.update(value);
    return res.status(200).json(response.successResponse(updated, 'Car brand actualizado'));
  } catch (err) {
    logger.error('Error al actualizar car_brand', err);
    return res.status(500).json(response.errorResponse('Error al actualizar car_brand', err));
  }
};

const deactivateCarBrand = async (req, res) => {
  const response = new ApiResponse();
  const { brand_id } = req.params;
  try {
    const item = await CarBrand.findByPk(brand_id);
    if (!item) return res.status(404).json(response.errorResponse('No encontrado'));
    item.status = false;
    await item.save();
    return res.status(200).json(response.successResponse(null, 'Car brand desactivado'));
  } catch (err) {
    logger.error('Error al desactivar car_brand', err);
    return res.status(500).json(response.errorResponse('Error al desactivar car_brand', err));
  }
};

const activateCarBrand = async (req, res) => {
  const response = new ApiResponse();
  const { brand_id } = req.params;
  try {
    const item = await CarBrand.findByPk(brand_id);
    if (!item) return res.status(404).json(response.errorResponse('No encontrado'));
    item.status = true;
    await item.save();
    return res.status(200).json(response.successResponse(null, 'Car brand activado'));
  } catch (err) {
    logger.error('Error al activar car_brand', err);
    return res.status(500).json(response.errorResponse('Error al activar car_brand', err));
  }
};

module.exports = { listCarBrands, createCarBrand, updateCarBrand, deactivateCarBrand, activateCarBrand };
