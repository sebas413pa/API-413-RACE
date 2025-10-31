'use strict';
const fs = require('fs');
const path = require('path');
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

const normalizeNumber = (value) => (value === undefined || value === null || value === '' ? undefined : Number(value));
const normalizeBoolean = (value) => {
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value === 1;
  const lowered = String(value).toLowerCase();
  return lowered === 'true' || lowered === '1' || lowered === 'yes' || lowered === 'on';
};
const normalizeNullableString = (value) => {
  if (value === undefined) return undefined;
  if (value === null) return null;
  const str = String(value);
  const trimmedLower = str.trim().toLowerCase();
  if (trimmedLower === 'null') return null;
  if (trimmedLower === 'undefined') return undefined;
  return str;
};
const setIfDefined = (target, key, value) => {
  if (value !== undefined) target[key] = value;
};
const getAllUploadedFiles = (req) => {
  if (!req) return [];
  if (req.file) return [req.file];
  if (!req.files) return [];
  if (Array.isArray(req.files)) return req.files;
  const collected = [];
  for (const key of Object.keys(req.files)) {
    const entry = req.files[key];
    if (Array.isArray(entry)) collected.push(...entry);
    else if (entry) collected.push(entry);
  }
  return collected;
};
const toRelativeUploadPath = (filename) => `/uploads/products/${filename}`;
const toAbsoluteUploadPath = (relativePath) => {
  if (!relativePath) return null;
  if (relativePath.startsWith('http://') || relativePath.startsWith('https://')) return null;
  const trimmed = relativePath.startsWith('/') ? relativePath.slice(1) : relativePath;
  return path.join(__dirname, '..', trimmed);
};
const ensureAbsoluteUrl = (url) => {
  if (!url) return url;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  if (!url.startsWith('/uploads')) return url;
  return `${config.protocol}://${config.host}:${config.port}${url}`;
};
const removeFileQuietly = (absolutePath) => {
  if (!absolutePath) return;
  try {
    fs.unlinkSync(absolutePath);
  } catch (err) {
    logger.warn('No se pudo eliminar archivo', { absolutePath, err });
  }
};

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
      obj.image_url = ensureAbsoluteUrl(obj.image_url);
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
  const uploadedFiles = getAllUploadedFiles(req);
  const uploadFile = uploadedFiles.length ? uploadedFiles[0] : null;
  const cleanupUploads = () => {
    for (const file of uploadedFiles) {
      if (file && file.path) removeFileQuietly(file.path);
    }
  };
  const validationPayload = {};
  setIfDefined(validationPayload, 'name', normalizeNullableString(req.body.name));
  setIfDefined(validationPayload, 'description', normalizeNullableString(req.body.description));
  setIfDefined(validationPayload, 'image_url', normalizeNullableString(req.body.image_url));
  setIfDefined(validationPayload, 'stock', normalizeNumber(req.body.stock));
  const salePriceInputCreate = typeof req.body.sale_price !== 'undefined' ? req.body.sale_price : req.body.price;
  setIfDefined(validationPayload, 'sale_price', normalizeNumber(salePriceInputCreate));
  setIfDefined(validationPayload, 'purchase_price', normalizeNumber(req.body.purchase_price));
  setIfDefined(validationPayload, 'category_product_id', normalizeNumber(req.body.category_product_id));
  setIfDefined(validationPayload, 'brand_product_id', normalizeNumber(req.body.brand_product_id));
  setIfDefined(validationPayload, 'status', normalizeBoolean(req.body.status));

  const { error, value } = createProductSchema.validate(validationPayload, { abortEarly: false, stripUnknown: true });
  if (error) {
    cleanupUploads();
    return res.status(400).json(response.errorResponse('Datos inválidos', error.details));
  }

  if (uploadFile) {
    value.image_url = toRelativeUploadPath(uploadFile.filename);
  } else if (typeof value.image_url === 'undefined' || value.image_url === '') {
    value.image_url = null;
  }

  try {
    const { brand_product_id, category_product_id } = value;

    const brand = await BrandProduct.findByPk(brand_product_id);
    if (!brand) {
      cleanupUploads();
      return res.status(404).json(response.errorResponse('Marca no encontrada'));
    }

    const category = await CategoryProduct.findByPk(category_product_id);
    if (!category) {
      cleanupUploads();
      return res.status(404).json(response.errorResponse('Categoría no encontrada'));
    }

    const item = await Product.create(value);
    const data = item.toJSON();
    data.image_url = ensureAbsoluteUrl(data.image_url);
    const unusedFiles = uploadedFiles.filter((file) => file !== uploadFile);
    for (const file of unusedFiles) {
      if (file && file.path) removeFileQuietly(file.path);
    }
    return res.status(201).json(response.successResponse(data, 'Producto creado exitosamente'));
  } catch (err) {
    logger.error('Error al crear producto', err);
    cleanupUploads();
    return res.status(500).json(response.errorResponse('Error al crear producto', err));
  }
};

const updateProduct = async (req, res) => {
  const response = new ApiResponse();
  const { product_id } = req.params;
  const paramResult = productIdParamSchema.validate(product_id);
  if (paramResult.error) return res.status(400).json(response.errorResponse('ID inválido', paramResult.error.details));

  const uploadedFiles = getAllUploadedFiles(req);
  const uploadFile = uploadedFiles.length ? uploadedFiles[0] : null;
  const cleanupUploads = () => {
    for (const file of uploadedFiles) {
      if (file && file.path) removeFileQuietly(file.path);
    }
  };
  const validationPayload = {};
  setIfDefined(validationPayload, 'name', normalizeNullableString(req.body.name));
  setIfDefined(validationPayload, 'description', normalizeNullableString(req.body.description));
  setIfDefined(validationPayload, 'image_url', normalizeNullableString(req.body.image_url));
  setIfDefined(validationPayload, 'stock', normalizeNumber(req.body.stock));
  const salePriceInputUpdate = typeof req.body.sale_price !== 'undefined' ? req.body.sale_price : req.body.price;
  setIfDefined(validationPayload, 'sale_price', normalizeNumber(salePriceInputUpdate));
  setIfDefined(validationPayload, 'purchase_price', normalizeNumber(req.body.purchase_price));
  setIfDefined(validationPayload, 'category_product_id', normalizeNumber(req.body.category_product_id));
  setIfDefined(validationPayload, 'brand_product_id', normalizeNumber(req.body.brand_product_id));
  setIfDefined(validationPayload, 'status', normalizeBoolean(req.body.status));

  const { error, value } = updateProductSchema.validate(validationPayload, { abortEarly: false, stripUnknown: true });
  if (error) {
    cleanupUploads();
    return res.status(400).json(response.errorResponse('Datos inválidos', error.details));
  }

  try {
    const item = await Product.findByPk(product_id);
    if (!item) return res.status(404).json(response.errorResponse('Producto no encontrado'));

    if (value.brand_product_id) {
      const brand = await BrandProduct.findByPk(value.brand_product_id);
      if (!brand) {
        cleanupUploads();
        return res.status(404).json(response.errorResponse('Marca no encontrada'));
      }
    }

    if (value.category_product_id) {
      const category = await CategoryProduct.findByPk(value.category_product_id);
      if (!category) {
        cleanupUploads();
        return res.status(404).json(response.errorResponse('Categoría no encontrada'));
      }
    }

    const previousImage = item.image_url;
    if (uploadFile) {
      value.image_url = toRelativeUploadPath(uploadFile.filename);
    } else if (typeof value.image_url !== 'undefined') {
      if (value.image_url === '' || value.image_url === null) {
        value.image_url = null;
      }
    }

    const updated = await item.update(value);
    const data = updated.toJSON();
    data.image_url = ensureAbsoluteUrl(data.image_url);

    if (uploadFile && previousImage) {
      const absolute = toAbsoluteUploadPath(previousImage);
      removeFileQuietly(absolute);
    }

    if (!uploadFile && typeof value.image_url !== 'undefined' && value.image_url === null && previousImage) {
      const absolute = toAbsoluteUploadPath(previousImage);
      removeFileQuietly(absolute);
    }

    const unusedFiles = uploadedFiles.filter((file) => file !== uploadFile);
    for (const file of unusedFiles) {
      if (file && file.path) removeFileQuietly(file.path);
    }

    return res.status(200).json(response.successResponse(data, 'Producto actualizado exitosamente'));
  } catch (err) {
    logger.error('Error al actualizar producto', err);
    cleanupUploads();
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
