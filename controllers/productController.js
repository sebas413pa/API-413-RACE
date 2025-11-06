'use strict';
const fs = require('fs');
const path = require('path');
const { Op } = require('sequelize');
const { models } = require('../db');
const {
  products: Product,
  brand_products: BrandProduct,
  category_products: CategoryProduct,
  promotion_products: PromotionProduct,
  promotions: Promotion,
} = models;
const logger = require('../utils/logger');
const ApiResponse = require('../utils/apiResponse');
const {
  listProductsSchema,
  createProductSchema,
  updateProductSchema,
  productIdParamSchema,
} = require('../schemas/productSchema');

const config = require('../config/config');
const { resolvePublicAssetUrl } = require('../utils/assetUrls');

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
    if (!fs.existsSync(absolutePath)) {
      return;
    }
    fs.unlinkSync(absolutePath);
  } catch (err) {
    logger.warn('No se pudo eliminar archivo', { absolutePath, err });
  }
};
const toPriceNumber = (value) => {
  if (value === undefined || value === null || value === '') return null;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? null : parsed;
};
const computePromotionPrice = (basePrice, promotion) => {
  if (basePrice === null || basePrice === undefined) return null;
  if (typeof basePrice !== 'number' || Number.isNaN(basePrice)) return null;
  if (!promotion) return null;
  const discountValue = toPriceNumber(promotion.discount_value);
  if (discountValue === null) return null;

  let finalPrice = basePrice;
  if (promotion.discount_type === 'percentage') {
    finalPrice = basePrice * (1 - discountValue / 100);
  } else if (promotion.discount_type === 'fixed_amount') {
    finalPrice = basePrice - discountValue;
  }

  if (!Number.isFinite(finalPrice)) return null;
  if (finalPrice < 0) finalPrice = 0;
  return Number(finalPrice.toFixed(2));
};
const selectBestPromotion = (basePrice, promotionProducts) => {
  if (basePrice === null || basePrice === undefined) return null;
  if (!Array.isArray(promotionProducts) || !promotionProducts.length) return null;
  let bestData = null;
  let bestPrice = basePrice;

  for (const relation of promotionProducts) {
    if (!relation || !relation.promotion) continue;
    const promotion = relation.promotion;
    const promoPrice = computePromotionPrice(basePrice, promotion);
    if (promoPrice === null) continue;
    if (bestData === null || promoPrice < bestPrice) {
      bestPrice = promoPrice;
      bestData = {
        promotion,
        price: promoPrice,
      };
    }
  }

  return bestData;
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
        obj.image_url = resolvePublicAssetUrl(obj.image_url) || ensureAbsoluteUrl(obj.image_url);
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

  const { error, value } = createProductSchema.validate(req.body);
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
  const salePrice = Number((value.purchase_price / (1 - value.profit_margin / 100)).toFixed(2));
    const item = await Product.create({...value, sale_price: salePrice});
    const data = item.toJSON();
    data.image_url = resolvePublicAssetUrl(data.image_url) || ensureAbsoluteUrl(data.image_url);
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

const listCatalogProducts = async (req, res) => {
  const response = new ApiResponse();
  try {
    const now = new Date();
    const items = await Product.findAll({
      where: {
        status: true,
        stock: { [Op.gt]: 0 },
      },
      attributes: ['product_id', 'name', 'description', 'image_url', 'stock', 'sale_price', 'purchase_price'],
      include: [
        { model: BrandProduct, as: 'brand_product', attributes: ['brand_product_id', 'brand_name'] },
        { model: CategoryProduct, as: 'category_product', attributes: ['category_product_id', 'category_name'] },
        {
          model: PromotionProduct,
          as: 'promotion_products',
          required: false,
          attributes: ['promotion_product_id'],
          include: [
            {
              model: Promotion,
              as: 'promotion',
              required: true,
              attributes: ['promotion_id', 'promotion_name', 'discount_type', 'discount_value', 'start_date', 'end_date', 'status'],
              where: {
                status: true,
                start_date: { [Op.lte]: now },
                end_date: { [Op.or]: [{ [Op.gte]: now }, { [Op.eq]: null }] },
              },
            },
          ],
        },
      ],
      order: [['product_id', 'ASC']],
    });

    const mapped = items.map((product) => {
      const obj = product.toJSON();
      const regularPriceCandidate = toPriceNumber(obj.sale_price) ?? toPriceNumber(obj.purchase_price);
      const regularPrice = regularPriceCandidate !== null ? Number(regularPriceCandidate.toFixed(2)) : null;
      const promotionData = regularPrice !== null ? selectBestPromotion(regularPrice, obj.promotion_products) : null;
      let discountPercentage = null;

      if (promotionData && Number.isFinite(regularPrice) && regularPrice > 0) {
        const difference = regularPrice - promotionData.price;
        if (difference > 0) {
          discountPercentage = Number(((difference / regularPrice) * 100).toFixed(2));
        }
      }

      const result = {
        product_id: obj.product_id,
        name: obj.name,
        description: obj.description,
        image_url: ensureAbsoluteUrl(obj.image_url),
    image_url: resolvePublicAssetUrl(obj.image_url) || ensureAbsoluteUrl(obj.image_url),
        stock: obj.stock,
        regular_price: regularPrice,
        promotion_price: promotionData ? promotionData.price : null,
        promotion_discount_percentage: discountPercentage,
        promotion: promotionData
          ? {
              promotion_id: promotionData.promotion.promotion_id,
              promotion_name: promotionData.promotion.promotion_name,
              discount_type: promotionData.promotion.discount_type,
              discount_value: toPriceNumber(promotionData.promotion.discount_value),
              start_date: promotionData.promotion.start_date,
              end_date: promotionData.promotion.end_date,
            }
          : null,
      };

      if (obj.brand_product) {
        result.brand = {
          brand_product_id: obj.brand_product.brand_product_id,
          brand_name: obj.brand_product.brand_name,
        };
      }
      if (obj.category_product) {
        result.category = {
          category_product_id: obj.category_product.category_product_id,
          category_name: obj.category_product.category_name,
        };
      }

      return result;
    });

    return res.status(200).json(response.successResponse(mapped, 'Catálogo de productos obtenido exitosamente'));
  } catch (err) {
    logger.error('Error al obtener catálogo de productos', err);
    return res.status(500).json(response.errorResponse('Error al obtener catálogo de productos', err));
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

  const { error, value } = updateProductSchema.validate(req.body);
  if (error) {
    cleanupUploads();
    return res.status(400).json(response.errorResponse('Datos inválidos', error.details));
  }

  try {
    const item = await Product.findByPk(product_id);
    if (!item) return res.status(404).json(response.errorResponse('Producto no encontrado'));

    const previousImage = item.image_url;

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

    if (uploadFile) {
      value.image_url = toRelativeUploadPath(uploadFile.filename);
    } else if (typeof value.image_url !== 'undefined') {
      if (value.image_url === '' || value.image_url === null) {
        value.image_url = null;
      }
    }

    const nextImageValue = typeof value.image_url !== 'undefined' ? value.image_url : previousImage;

    const updated = await item.update(value);
    const data = updated.toJSON();
    data.image_url = resolvePublicAssetUrl(data.image_url) || ensureAbsoluteUrl(data.image_url);

    if (previousImage && previousImage !== nextImageValue) {
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
  listCatalogProducts,
  createProduct,
  updateProduct,
  deactivateProduct,
  activateProduct,
};
