'use strict';
const fs = require('fs');
const path = require('path');
const { Op } = require('sequelize');
const { models, sequelize  } = require('../db');
const { car_brands: CarBrand } = models;
const logger = require('../utils/logger');
const ApiResponse = require('../utils/apiResponse');
const config = require('../config/config');
const { resolvePublicAssetUrl } = require('../utils/assetUrls');
const {
  listCarBrandsSchema,
  createCarBrandSchema,
  updateCarBrandSchema,
  carBrandIdParamSchema,
} = require('../schemas/carBrandSchema');
const { default: api } = require('../utils/apiClient');


const toRelativeUploadPath = (filename) => `/uploads/car-brands/${filename}`;

const toAbsoluteUploadPath = (relativePath) => {
  if (!relativePath) return null;
  if (relativePath.startsWith('http://') || relativePath.startsWith('https://')) return null;
  const trimmed = relativePath.startsWith('/') ? relativePath.slice(1) : relativePath;
  return path.join(__dirname, '..', trimmed);
};

const removeFileQuietly = (absolutePath) => {
  if (!absolutePath) return;
  try {
    if (fs.existsSync(absolutePath)) {
      fs.unlinkSync(absolutePath);
    }
  } catch (err) {
    logger.warn('No se pudo eliminar archivo', { absolutePath, err });
  }
};

const normalizeBoolean = (value) => {
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  const lowered = String(value).trim().toLowerCase();
  if (['true', '1', 'yes', 'on'].includes(lowered)) return true;
  if (['false', '0', 'no', 'off'].includes(lowered)) return false;
  return undefined;
};

const normalizeImageValue = (value) => {
  if (value === undefined) return undefined;
  if (value === null) return null;
  const trimmed = String(value).trim();
  return trimmed === '' ? null : trimmed;
};

const setIfDefined = (target, key, value) => {
  if (value !== undefined) target[key] = value;
};

const listCarBrands = async (req, res) => {
  const response = new ApiResponse();
  const { error, value } = listCarBrandsSchema.validate(req.query, { abortEarly: false, stripUnknown: true });
  if (error) return res.status(400).json(response.errorResponse('Parámetros inválidos', error.details));
  const { status, brand_name } = value;
  try {
    const where = {};
    if (typeof status !== 'undefined') where.status = status;
    if (brand_name) where.brand_name = { [Op.like]: `%${brand_name}%` };
    const items = await CarBrand.findAll({ where });
    const mapped = items.map((brand) => {
      const data = brand.toJSON();
      data.image_url = resolvePublicAssetUrl(data.image_url) || data.image_url;
      return data;
    });
    return res.status(200).json(response.successResponse(mapped, 'Car brands obtenidos exitosamente'));
  } catch (err) {
    logger.error('Error al listar car_brands', err);
    return res.status(500).json(response.errorResponse('Error al listar car_brands', err));
  }
};

const createCarBrand = async (req, res) => {
  const accessToken = req.cookies?.accessToken;
const refreshToken = req.cookies?.refreshToken;

  const response = new ApiResponse();
  const file = req.file || null;
  const cleanupUpload = () => {
    if (file && file.path) removeFileQuietly(file.path);
  };

  const payload = {
    brand_name: req.body.brand_name,
    status: normalizeBoolean(req.body.status),
    image_url: req.body.image_url,
  };

  const { error, value } = createCarBrandSchema.validate(payload, { abortEarly: false, stripUnknown: true });
  if (error) {
    cleanupUpload();
    return res.status(400).json(response.errorResponse('Datos inválidos', error.details));
  }

  const dataToCreate = { brand_name: value.brand_name };
  setIfDefined(dataToCreate, 'status', value.status);

  if (file) {
    dataToCreate.image_url = toRelativeUploadPath(file.filename);
  } else {
    const normalizedImage = normalizeImageValue(value.image_url);
    setIfDefined(dataToCreate, 'image_url', normalizedImage);
  }

  const transaction = await sequelize.transaction();

  try {
  const item = await CarBrand.create(dataToCreate);
  const crmItem = await api.post('/brands', {
    brand_id: item.brand_id,
    brand_name: item.brand_name,
    image_url: item.image_url,
  },{
    cookies: {
      accessToken,
      refreshToken
    }
  })

  if (!crmItem.data.success) {
      await transaction.rollback();
      cleanupUpload();

      return res.status(400).json(
        response.errorResponse(
          'No se pudo sincronizar con el CRM',
          crmResp.data
        )
    )
  }
    const data = item.toJSON();
    data.image_url = resolvePublicAssetUrl(data.image_url) || data.image_url;
    await transaction.commit();
    return res.status(201).json(response.successResponse(data, 'Car brand creado'));
  } catch (err) {
    cleanupUpload();
    logger.error('Error al crear car_brand', err);
    return res.status(500).json(response.errorResponse('Error al crear car_brand', err));
  }
};

const updateCarBrand = async (req, res) => {
  const response = new ApiResponse();
  const { brand_id } = req.params;
  const paramResult = carBrandIdParamSchema.validate(brand_id);
  if (paramResult.error) return res.status(400).json(response.errorResponse('ID inválido', paramResult.error.details));

  const file = req.file || null;
  const cleanupUpload = () => {
    if (file && file.path) removeFileQuietly(file.path);
  };

  const payload = {
    brand_name: req.body.brand_name,
    status: normalizeBoolean(req.body.status),
    image_url: req.body.image_url,
  };

  const { error, value } = updateCarBrandSchema.validate(payload, { abortEarly: false, stripUnknown: true });
  if (error) {
    cleanupUpload();
    return res.status(400).json(response.errorResponse('Datos inválidos', error.details));
  }

  const removeImage = normalizeBoolean(req.body.remove_image) === true;

  try {
    const item = await CarBrand.findByPk(brand_id);
    if (!item) {
      cleanupUpload();
      return res.status(404).json(response.errorResponse('No encontrado'));
    }

    const originalImage = item.image_url;
    const updates = {};
    setIfDefined(updates, 'brand_name', value.brand_name);
    setIfDefined(updates, 'status', value.status);

    let previousImageAbsolute = null;

    if (file) {
      updates.image_url = toRelativeUploadPath(file.filename);
      previousImageAbsolute = toAbsoluteUploadPath(originalImage);
    } else if (removeImage) {
      updates.image_url = null;
      previousImageAbsolute = toAbsoluteUploadPath(originalImage);
    } else if (value.image_url !== undefined) {
      const normalizedImage = normalizeImageValue(value.image_url);
      updates.image_url = normalizedImage;
      if (normalizedImage !== normalizeImageValue(originalImage)) {
        previousImageAbsolute = toAbsoluteUploadPath(originalImage);
      }
    }

    if (!Object.keys(updates).length) {
      cleanupUpload();
      return res.status(400).json(response.errorResponse('Debe proporcionar al menos un campo para actualizar'));
    }

    const updated = await item.update(updates);

    if (previousImageAbsolute) {
      removeFileQuietly(previousImageAbsolute);
    }

  const data = updated.toJSON();
  data.image_url = resolvePublicAssetUrl(data.image_url) || data.image_url;
    return res.status(200).json(response.successResponse(data, 'Car brand actualizado'));
  } catch (err) {
    cleanupUpload();
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
