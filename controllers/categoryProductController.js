'use strict';
const { models } = require('../db');
const { category_products: CategoryProduct } = models;
const logger = require('../utils/logger');
const ApiResponse = require('../utils/apiResponse');
const { listCategoryProductsSchema, createCategoryProductSchema, updateCategoryProductSchema, categoryProductIdParamSchema } = require('../schemas/categoryProductSchema');

const listCategoryProducts = async (req, res) => {
  const response = new ApiResponse();
  const { error, value } = listCategoryProductsSchema.validate(req.query);
  if (error) return res.status(400).json(response.errorResponse('Parámetros inválidos', error.details));
  const { status, category_name } = value;
  try {
    const { Op } = require('sequelize');
    const where = {};
    if (typeof status !== 'undefined') where.status = status;
    if (category_name) where.category_name = { [Op.like]: `%${category_name}%` };
    const items = await CategoryProduct.findAll({ where });
    return res.status(200).json(response.successResponse(items, 'Category products obtenidos'));
  } catch (err) {
    logger.error('Error al listar category_products', err);
    return res.status(500).json(response.errorResponse('Error al listar category_products', err));
  }
};

const createCategoryProduct = async (req, res) => {
  const response = new ApiResponse();
  const { error, value } = createCategoryProductSchema.validate(req.body);
  if (error) return res.status(400).json(response.errorResponse('Datos inválidos', error.details));
  try {
    const item = await CategoryProduct.create(value);
    return res.status(201).json(response.successResponse(item, 'Category product creado'));
  } catch (err) {
    logger.error('Error al crear category_product', err);
    return res.status(500).json(response.errorResponse('Error al crear category_product', err));
  }
};

const updateCategoryProduct = async (req, res) => {
  const response = new ApiResponse();
  const { category_product_id } = req.params;
  const paramResult = categoryProductIdParamSchema.validate(category_product_id);
  if (paramResult.error) return res.status(400).json(response.errorResponse('ID inválido', paramResult.error.details));
  const { error, value } = updateCategoryProductSchema.validate(req.body);
  if (error) return res.status(400).json(response.errorResponse('Datos inválidos', error.details));
  try {
    const item = await CategoryProduct.findByPk(category_product_id);
    if (!item) return res.status(404).json(response.errorResponse('No encontrado'));
    const updated = await item.update(value);
    return res.status(200).json(response.successResponse(updated, 'Category product actualizado'));
  } catch (err) {
    logger.error('Error al actualizar category_product', err);
    return res.status(500).json(response.errorResponse('Error al actualizar category_product', err));
  }
};

const deactivateCategoryProduct = async (req, res) => {
  const response = new ApiResponse();
  const { category_product_id } = req.params;
  try {
    const item = await CategoryProduct.findByPk(category_product_id);
    if (!item) return res.status(404).json(response.errorResponse('No encontrado'));
    item.status = false;
    await item.save();
    return res.status(200).json(response.successResponse(null, 'Category product desactivado'));
  } catch (err) {
    logger.error('Error al desactivar category_product', err);
    return res.status(500).json(response.errorResponse('Error al desactivar category_product', err));
  }
};

const activateCategoryProduct = async (req, res) => {
  const response = new ApiResponse();
  const { category_product_id } = req.params;
  try {
    const item = await CategoryProduct.findByPk(category_product_id);
    if (!item) return res.status(404).json(response.errorResponse('No encontrado'));
    item.status = true;
    await item.save();
    return res.status(200).json(response.successResponse(null, 'Category product activado'));
  } catch (err) {
    logger.error('Error al activar category_product', err);
    return res.status(500).json(response.errorResponse('Error al activar category_product', err));
  }
};

module.exports = { listCategoryProducts, createCategoryProduct, updateCategoryProduct, deactivateCategoryProduct, activateCategoryProduct };
