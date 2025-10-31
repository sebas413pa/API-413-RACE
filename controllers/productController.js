'use strict';
const { Op } = require('sequelize');
const { models } = require('../db');
const { products: Product, brand_products: BrandProduct, category_products: CategoryProduct } = models;
const logger = require('../utils/logger');
const ApiResponse = require('../utils/apiResponse');
const {
  listProductsSchema,
  createProductSchema,
  updateProductSchema,
  productIdParamSchema,
} = require('../schemas/productSchema');

const config = require('../config/config');

const listProducts = async (req, res) => {
  const response = new ApiResponse();
  const { error, value } = listProductsSchema.validate(req.query);
  if (error) return res.status(400).json(response.errorResponse('Parámetros inválidos', error.details));

  const { status, category_product_id, brand_product_id, name } = value;
  try {
    const where = {};
    if (typeof status !== 'undefined') where.status = status;
    if (category_product_id) where.category_product_id = category_product_id;
    if (brand_product_id) where.brand_product_id = brand_product_id;
    if (name) where.name = { [Op.like]: `%${name}%` };

    const items = await Product.findAll({
      where,
      include: [
        { model: BrandProduct, as: 'brand_product', attributes: ['brand_product_id', 'brand_name'] },
        { model: CategoryProduct, as: 'category_product', attributes: ['category_product_id', 'category_name'] },
      ],
    });

    const mapped = items.map((product) => {
      const obj = product.toJSON();
      if (obj.image_url && obj.image_url.startsWith('/uploads')) {
        obj.image_url = `${config.protocol}://${config.host}:${config.port}${obj.image_url}`;
      }
      return obj;
    });

    return res.status(200).json(response.successResponse(mapped, 'Productos obtenidos exitosamente'));
  } catch (err) {
    logger.error('Error al listar productos', err);
    return res.status(500).json(response.errorResponse('Error al listar productos', err));
  }
};

const createProduct = async (req, res) => {
  const response = new ApiResponse();
  const { error, value } = createProductSchema.validate(req.body);
  if (error) return res.status(400).json(response.errorResponse('Datos inválidos', error.details));

  try {
    const { brand_product_id, category_product_id } = value;

    const brand = await BrandProduct.findByPk(brand_product_id);
    if (!brand) return res.status(404).json(response.errorResponse('Marca no encontrada'));

    const category = await CategoryProduct.findByPk(category_product_id);
    if (!category) return res.status(404).json(response.errorResponse('Categoría no encontrada'));

    const item = await Product.create(value);
    return res.status(201).json(response.successResponse(item, 'Producto creado exitosamente'));
  } catch (err) {
    logger.error('Error al crear producto', err);
    return res.status(500).json(response.errorResponse('Error al crear producto', err));
  }
};

const updateProduct = async (req, res) => {
  const response = new ApiResponse();
  const { product_id } = req.params;
  const paramResult = productIdParamSchema.validate(product_id);
  if (paramResult.error) return res.status(400).json(response.errorResponse('ID inválido', paramResult.error.details));

  const { error, value } = updateProductSchema.validate(req.body);
  if (error) return res.status(400).json(response.errorResponse('Datos inválidos', error.details));

  try {
    const item = await Product.findByPk(product_id);
    if (!item) return res.status(404).json(response.errorResponse('Producto no encontrado'));

    if (value.brand_product_id) {
      const brand = await BrandProduct.findByPk(value.brand_product_id);
      if (!brand) return res.status(404).json(response.errorResponse('Marca no encontrada'));
    }

    if (value.category_product_id) {
      const category = await CategoryProduct.findByPk(value.category_product_id);
      if (!category) return res.status(404).json(response.errorResponse('Categoría no encontrada'));
    }

    const updated = await item.update(value);
    return res.status(200).json(response.successResponse(updated, 'Producto actualizado exitosamente'));
  } catch (err) {
    logger.error('Error al actualizar producto', err);
    return res.status(500).json(response.errorResponse('Error al actualizar producto', err));
  }
};

const deactivateProduct = async (req, res) => {
  const response = new ApiResponse();
  const { product_id } = req.params;
  try {
    const item = await Product.findByPk(product_id);
    if (!item) return res.status(404).json(response.errorResponse('Producto no encontrado'));
    item.status = false;
    await item.save();
    return res.status(200).json(response.successResponse(null, 'Producto desactivado exitosamente'));
  } catch (err) {
    logger.error('Error al desactivar producto', err);
    return res.status(500).json(response.errorResponse('Error al desactivar producto', err));
  }
};

const activateProduct = async (req, res) => {
  const response = new ApiResponse();
  const { product_id } = req.params;
  try {
    const item = await Product.findByPk(product_id);
    if (!item) return res.status(404).json(response.errorResponse('Producto no encontrado'));
    item.status = true;
    await item.save();
    return res.status(200).json(response.successResponse(null, 'Producto activado exitosamente'));
  } catch (err) {
    logger.error('Error al activar producto', err);
    return res.status(500).json(response.errorResponse('Error al activar producto', err));
  }
};

module.exports = {
  listProducts,
  createProduct,
  updateProduct,
  deactivateProduct,
  activateProduct,
};
