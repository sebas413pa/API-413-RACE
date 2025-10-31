'use strict';
const { models } = require('../db');
const { brand_products: BrandProduct } = models;
const logger = require('../utils/logger');
const ApiResponse = require('../utils/apiResponse');
const {
  listBrandProductsSchema,
  createBrandProductSchema,
  updateBrandProductSchema,
  brandProductIdParamSchema,
} = require('../schemas/brandProductSchema');

const listBrandProducts = async (req, res) => {
  const response = new ApiResponse();
  const { error, value } = listBrandProductsSchema.validate(req.query);
  if (error) return res.status(400).json(response.errorResponse('Parámetros inválidos', error.details));

  const { status, brand_name } = value;
  try {
    const { Op } = require('sequelize');
    const where = {};
    if (typeof status !== 'undefined') where.status = status;
    if (brand_name) where.brand_name = { [Op.like]: `%${brand_name}%` };

    const items = await BrandProduct.findAll({ where });
    return res.status(200).json(response.successResponse(items, 'Brand products obtenidos exitosamente'));
  } catch (err) {
    logger.error('Error al listar brand_products', err);
    return res.status(500).json(response.errorResponse('Error al listar brand_products', err));
  }
};

const createBrandProduct = async (req, res) => {
  const response = new ApiResponse();
  const { error, value } = createBrandProductSchema.validate(req.body);
  if (error) return res.status(400).json(response.errorResponse('Datos inválidos', error.details));

  try {
    const item = await BrandProduct.create(value);
    return res.status(201).json(response.successResponse(item, 'Brand product creado exitosamente'));
  } catch (err) {
    logger.error('Error al crear brand_product', err);
    return res.status(500).json(response.errorResponse('Error al crear brand_product', err));
  }
};

const updateBrandProduct = async (req, res) => {
  const response = new ApiResponse();
  const { brand_product_id } = req.params;
  const paramResult = brandProductIdParamSchema.validate(brand_product_id);
  if (paramResult.error) return res.status(400).json(response.errorResponse('ID inválido', paramResult.error.details));

  const { error, value } = updateBrandProductSchema.validate(req.body);
  if (error) return res.status(400).json(response.errorResponse('Datos inválidos', error.details));

  try {
    const item = await BrandProduct.findByPk(brand_product_id);
    if (!item) return res.status(404).json(response.errorResponse('No encontrado'));
    const updated = await item.update(value);
    return res.status(200).json(response.successResponse(updated, 'Brand product actualizado'));
  } catch (err) {
    logger.error('Error al actualizar brand_product', err);
    return res.status(500).json(response.errorResponse('Error al actualizar brand_product', err));
  }
};

const deactivateBrandProduct = async (req, res) => {
  const response = new ApiResponse();
  const { brand_product_id } = req.params;
  try {
    const item = await BrandProduct.findByPk(brand_product_id);
    if (!item) return res.status(404).json(response.errorResponse('No encontrado'));
    item.status = false;
    await item.save();
    return res.status(200).json(response.successResponse(null, 'Brand product desactivado'));
  } catch (err) {
    logger.error('Error al desactivar brand_product', err);
    return res.status(500).json(response.errorResponse('Error al desactivar brand_product', err));
  }
};

const activateBrandProduct = async (req, res) => {
  const response = new ApiResponse();
  const { brand_product_id } = req.params;
  try {
    const item = await BrandProduct.findByPk(brand_product_id);
    if (!item) return res.status(404).json(response.errorResponse('No encontrado'));
    item.status = true;
    await item.save();
    return res.status(200).json(response.successResponse(null, 'Brand product activado'));
  } catch (err) {
    logger.error('Error al activar brand_product', err);
    return res.status(500).json(response.errorResponse('Error al activar brand_product', err));
  }
};

module.exports = {
  listBrandProducts,
  createBrandProduct,
  updateBrandProduct,
  deactivateBrandProduct,
  activateBrandProduct,
};
