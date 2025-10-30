'use strict';
const fs = require('fs');
const path = require('path');
const { models } = require('../db');
const { car_images: CarImage } = models;
const logger = require('../utils/logger');
const ApiResponse = require('../utils/apiResponse');
const { listCarImagesSchema, createCarImageSchema, updateCarImageSchema, carImageIdParamSchema } = require('../schemas/carImageSchema');

const config = require('../config/config');

const listCarImages = async (req, res) => {
  const response = new ApiResponse();
  const { error, value } = listCarImagesSchema.validate(req.query);
  if (error) return res.status(400).json(response.errorResponse('Parámetros inválidos', error.details));
  const { status, car_id } = value;
  try {
    const where = {};
    if (typeof status !== 'undefined') where.status = status;
    if (car_id) where.car_id = car_id;
    const items = await CarImage.findAll({ where });
    const mapped = items.map(i => {
      const item = i.toJSON();
      if (item.image_url && item.image_url.startsWith('/uploads')) {
        item.image_url = `${config.protocol}://${config.host}:${config.port}${item.image_url}`;
      }
      return item;
    });
    return res.status(200).json(response.successResponse(mapped, 'Car images obtenidos'));
  } catch (err) {
    logger.error('Error al listar car_images', err);
    return res.status(500).json(response.errorResponse('Error al listar car_images', err));
  }
};

const createCarImage = async (req, res) => {
  const response = new ApiResponse();
  const { error, value } = createCarImageSchema.validate(req.body);
  if (error) return res.status(400).json(response.errorResponse('Datos inválidos', error.details));
  const { car_id, is_main } = value;

  try {
    const created = [];
    if (req.files && req.files.length) {
      for (const f of req.files) {
        const relPath = `/uploads/cars/${f.filename}`;
        const row = await CarImage.create({ car_id, image_url: relPath, is_main: !!is_main });
        const obj = row.toJSON();
        obj.image_url = `${config.protocol}://${config.host}:${config.port}${relPath}`;
        created.push(obj);
      }
      return res.status(201).json(response.successResponse(created, 'Car images creados exitosamente'));
    }

    if (value.image_url) {
      const row = await CarImage.create({ car_id, image_url: value.image_url, is_main: !!is_main });
      return res.status(201).json(response.successResponse(row, 'Car image creado'));
    }

    return res.status(400).json(response.errorResponse('No se proporcionaron archivos ni image_url'));
  } catch (err) {
    logger.error('Error al crear car_image', err);
    return res.status(500).json(response.errorResponse('Error al crear car_image', err));
  }
};

const updateCarImage = async (req, res) => {
  const response = new ApiResponse();
  const { car_image_id } = req.params;
  const paramResult = carImageIdParamSchema.validate(car_image_id);
  if (paramResult.error) return res.status(400).json(response.errorResponse('ID inválido', paramResult.error.details));
  const { error, value } = updateCarImageSchema.validate(req.body);
  if (error) return res.status(400).json(response.errorResponse('Datos inválidos', error.details));
  try {
    const item = await CarImage.findByPk(car_image_id);
    if (!item) return res.status(404).json(response.errorResponse('No encontrado'));
    const updated = await item.update(value);
    return res.status(200).json(response.successResponse(updated, 'Car image actualizado'));
  } catch (err) {
    logger.error('Error al actualizar car_image', err);
    return res.status(500).json(response.errorResponse('Error al actualizar car_image', err));
  }
};

const resolveImagePath = (relativePath) => {
  if (!relativePath) return null;
  const cleaned = relativePath.startsWith('/') ? relativePath.slice(1) : relativePath;
  return path.join(__dirname, '..', cleaned);
};

const deactivateCarImage = async (req, res) => {
  const response = new ApiResponse();
  const { car_image_id } = req.params;
  try {
    const item = await CarImage.findByPk(car_image_id);
    if (!item) return res.status(404).json(response.errorResponse('No encontrado'));

    const filePath = resolveImagePath(item.image_url);
    await item.destroy();

    if (filePath) {
      try {
        fs.unlinkSync(filePath);
      } catch (err) {
        logger.warn('No se pudo borrar archivo al eliminar car_image', { filePath, err });
      }
    }

    return res.status(200).json(response.successResponse(null, 'Car image eliminado'));
  } catch (err) {
    logger.error('Error al eliminar car_image', err);
    return res.status(500).json(response.errorResponse('Error al eliminar car_image', err));
  }
};

const activateCarImage = async (req, res) => {
  const response = new ApiResponse();
  const { car_image_id } = req.params;
  try {
    const item = await CarImage.findByPk(car_image_id);
    if (!item) return res.status(404).json(response.errorResponse('No encontrado'));
    item.status = true;
    await item.save();
    return res.status(200).json(response.successResponse(null, 'Car image activado'));
  } catch (err) {
    logger.error('Error al activar car_image', err);
    return res.status(500).json(response.errorResponse('Error al activar car_image', err));
  }
};

module.exports = { listCarImages, createCarImage, updateCarImage, deactivateCarImage, activateCarImage };
