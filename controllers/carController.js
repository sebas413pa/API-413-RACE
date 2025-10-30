"use strict";
const fs = require("fs");
const path = require("path");
const { sequelize, models } = require("../db");
const { cars: Car, car_images: CarImage } = models;
const logger = require("../utils/logger");
const ApiResponse = require("../utils/apiResponse");
const { listCarsSchema, createCarSchema, updateCarSchema, carIdParamSchema } = require("../schemas/carSchema");
const config = require("../config/config");

const normalizeNumber = (v) => (v === undefined || v === null || v === "" ? undefined : Number(v));
const normalizeBoolean = (v) => {
  if (v === undefined || v === null || v === "") return undefined;
  if (typeof v === "boolean") return v;
  return v === "true" || v === "1" || v === 1 || v === "on";
};
const normalizeString = (v) => (v === undefined || v === null || v === "" ? undefined : String(v));

const listCars = async (req, res) => {
  const response = new ApiResponse();
  const { error, value } = listCarsSchema.validate(req.query);
  if (error) return res.status(400).json(response.errorResponse("Parámetros inválidos", error.details));
  const { status, line_id, model } = value;
  try {
    const where = {};
    if (typeof status !== "undefined") where.status = status;
    if (line_id) where.line_id = line_id;
    if (model) where.model = model;
    const items = await Car.findAll({
      where,
      include: [
        { model: CarImage, as: "car_images" }
      ]
    });

    const mapped = items.map((c) => {
      const obj = c.toJSON();
      obj.images = (obj.car_images || []).map((ci) => ({
        car_image_id: ci.car_image_id,
        image_url: `${config.protocol}://${config.host}:${config.port}${ci.image_url}`,
        is_main: !!ci.is_main,
      }));
      delete obj.car_images;
      return obj;
    });

    return res.status(200).json(response.successResponse(mapped, "Cars obtenidos"));
  } catch (err) {
    logger.error("Error al listar cars", err);
    return res.status(500).json(response.errorResponse("Error al listar cars", err));
  }
};

const createCar = async (req, res) => {
  const response = new ApiResponse();
  const payload = {
    line_id: normalizeNumber(req.body.line_id),
    color: normalizeString(req.body.color),
    engine_capacity: normalizeNumber(req.body.engine_capacity),
    type_car: normalizeString(req.body.type_car),
    transmission: normalizeString(req.body.transmission),
    model: normalizeNumber(req.body.model),
    price: normalizeNumber(req.body.price),
    stock: normalizeNumber(req.body.stock),
  };

  const { error, value } = createCarSchema.validate(payload);
  if (error) return res.status(400).json(response.errorResponse("Datos inválidos", error.details));

  const normalizeFiles = (reqFiles) => {
    const allowed = ["images", "images[]", "image", "image[]", "files", "files[]"];
    if (!reqFiles) return [];
    if (Array.isArray(reqFiles)) {
      return reqFiles.filter((f) => allowed.includes(f.fieldname));
    }
    const arr = [];
    for (const k of allowed) {
      if (reqFiles[k] && Array.isArray(reqFiles[k])) arr.push(...reqFiles[k]);
    }
    return arr;
  };
  const files = normalizeFiles(req.files);
  logger.debug('createCar - files received', files.map(f => ({ fieldname: f.fieldname, filename: f.filename })));
  const t = await sequelize.transaction();
  try {
    if (value.line_id) {
      const CarLine = models.car_lines;
      const line = await CarLine.findByPk(value.line_id, { transaction: t });
      if (!line) {
        await t.rollback();
        return res.status(404).json(response.errorResponse("line_id no encontrado"));
      }
    }

  const car = await Car.create(value, { transaction: t });
  logger.debug('createCar - car created', { car_id: car.car_id });

    if (files.length) {
      const main_index = typeof req.body.main_image_index !== "undefined" ? Number(req.body.main_image_index) : 0;
      for (let i = 0; i < files.length; i++) {
        const f = files[i];
        const relPath = `/uploads/cars/${f.filename}`;
        const is_main = i === main_index;
        try {
          const row = await CarImage.create({ car_id: car.car_id, image_url: relPath, is_main }, { transaction: t });
          logger.debug('createCar - car_image created', { car_image_id: row.car_image_id, car_id: row.car_id, image_url: row.image_url });
        } catch (e) {
          logger.error('createCar - error creating CarImage', e);
          throw e; 
        }
      }
    }

    await t.commit();

    const result = car.toJSON();
    if (files.length) {
      result.images = files.map((f) => ({ image_url: `${config.protocol}://${config.host}:${config.port}/uploads/cars/${f.filename}` }));
    }

    return res.status(201).json(response.successResponse(result, "Car creado"));
  } catch (err) {
    try {
      await t.rollback();
    } catch (e) {
      logger.error("Rollback error", e);
    }
    if (files.length) {
      for (const f of files) {
        const p = path.join(__dirname, "..", "uploads", "cars", f.filename);
        try {
          fs.unlinkSync(p);
        } catch (e) {
          logger.warn("No se pudo borrar archivo", p, e);
        }
      }
    }
    logger.error("Error al crear car", err);
    return res.status(500).json(response.errorResponse("Error al crear car", err));
  }
};

const updateCar = async (req, res) => {
  const response = new ApiResponse();
  const { car_id } = req.params;
  const paramResult = carIdParamSchema.validate(car_id);
  if (paramResult.error) return res.status(400).json(response.errorResponse("ID inválido", paramResult.error.details));

  const payload = {
    line_id: normalizeNumber(req.body.line_id),
    color: normalizeString(req.body.color),
    engine_capacity: normalizeNumber(req.body.engine_capacity),
    type_car: normalizeString(req.body.type_car),
    transmission: normalizeString(req.body.transmission),
    model: normalizeNumber(req.body.model),
    price: normalizeNumber(req.body.price),
    stock: normalizeNumber(req.body.stock),
    status: normalizeBoolean(req.body.status),
  };

  const { error, value } = updateCarSchema.validate(payload);
  if (error) return res.status(400).json(response.errorResponse("Datos inválidos", error.details));

  const normalizeFilesForUpdate = (reqFiles) => {
    const allowed = ["images", "images[]", "image", "image[]", "files", "files[]"];
    if (!reqFiles) return [];
    if (Array.isArray(reqFiles)) {
      return reqFiles.filter((f) => allowed.includes(f.fieldname));
    }
    const arr = [];
    for (const k of allowed) {
      if (reqFiles[k] && Array.isArray(reqFiles[k])) arr.push(...reqFiles[k]);
    }
    return arr;
  };
  const files = normalizeFilesForUpdate(req.files);
  const delete_image_ids = req.body.delete_image_ids
    ? typeof req.body.delete_image_ids === "string"
      ? req.body.delete_image_ids.split(",").map((s) => Number(s.trim())).filter(Boolean)
      : req.body.delete_image_ids
    : [];
  const main_image_id = req.body.main_image_id ? Number(req.body.main_image_id) : undefined;
  const main_image_index = typeof req.body.main_image_index !== "undefined" ? Number(req.body.main_image_index) : undefined;

  const t = await sequelize.transaction();
  const filesToCleanupOnRollback = [];
  const filesToDeleteAfterCommit = [];
  try {
    const item = await Car.findByPk(car_id, { transaction: t });
    if (!item) {
      await t.rollback();
      return res.status(404).json(response.errorResponse("No encontrado"));
    }

    if (value.line_id) {
      const CarLine = models.car_lines;
      const line = await CarLine.findByPk(value.line_id, { transaction: t });
      if (!line) {
        await t.rollback();
        return res.status(404).json(response.errorResponse("line_id no encontrado"));
      }
    }

    await item.update(value, { transaction: t });

    if (delete_image_ids && delete_image_ids.length) {
      const imagesToDelete = await CarImage.findAll({ where: { car_image_id: delete_image_ids, car_id }, transaction: t });
      for (const img of imagesToDelete) {
        if (img.image_url) filesToDeleteAfterCommit.push(path.join(__dirname, "..", img.image_url));
        await img.destroy({ transaction: t });
      }
    }

    const createdNewImages = [];
    if (files.length) {
      for (const f of files) {
        const relPath = `/uploads/cars/${f.filename}`;
        const row = await CarImage.create({ car_id: item.car_id, image_url: relPath, is_main: false }, { transaction: t });
        createdNewImages.push(row);
        filesToCleanupOnRollback.push(path.join(__dirname, "..", "uploads", "cars", f.filename));
      }
    }

    if (main_image_id) {
      await CarImage.update({ is_main: false }, { where: { car_id: item.car_id }, transaction: t });
      const target = await CarImage.findOne({ where: { car_image_id: main_image_id, car_id: item.car_id }, transaction: t });
      if (target) await target.update({ is_main: true }, { transaction: t });
    } else if (typeof main_image_index !== "undefined" && createdNewImages.length) {
      const idx = main_image_index;
      if (idx >= 0 && idx < createdNewImages.length) {
        await CarImage.update({ is_main: false }, { where: { car_id: item.car_id }, transaction: t });
        await createdNewImages[idx].update({ is_main: true }, { transaction: t });
      }
    } else {
      const existingMain = await CarImage.findOne({ where: { car_id: item.car_id, is_main: true }, transaction: t });
      if (!existingMain && createdNewImages.length) {
        await createdNewImages[0].update({ is_main: true }, { transaction: t });
      }
    }

    await t.commit();

    for (const p of filesToDeleteAfterCommit) {
      try {
        fs.unlinkSync(p);
      } catch (e) {
        logger.warn("No se pudo borrar archivo eliminado", p, e);
      }
    }

    const updatedCar = await Car.findByPk(car_id);
    return res.status(200).json(response.successResponse(updatedCar, "Car actualizado"));
  } catch (err) {
    try {
      await t.rollback();
    } catch (e) {
      logger.error("Rollback error", e);
    }
    for (const p of filesToCleanupOnRollback) {
      try {
        fs.unlinkSync(p);
      } catch (e) {
        logger.warn("No se pudo borrar archivo (rollback)", p, e);
      }
    }
    logger.error("Error al actualizar car", err);
    return res.status(500).json(response.errorResponse("Error al actualizar car", err));
  }
};

const resolveImagePath = (relativePath) => {
  if (!relativePath) return null;
  const cleaned = relativePath.startsWith("/") ? relativePath.slice(1) : relativePath;
  return path.join(__dirname, "..", cleaned);
};

const deactivateCar = async (req, res) => {
  const response = new ApiResponse();
  const { car_id } = req.params;
  const t = await sequelize.transaction();
  const filesToDelete = [];
  try {
    const item = await Car.findByPk(car_id, { transaction: t });
    if (!item) {
      await t.rollback();
      return res.status(404).json(response.errorResponse("No encontrado"));
    }

    const images = await CarImage.findAll({ where: { car_id }, transaction: t });
    for (const img of images) {
      const filePath = resolveImagePath(img.image_url);
      if (filePath) filesToDelete.push(filePath);
      await img.destroy({ transaction: t });
    }

    item.status = false;
    await item.save({ transaction: t });

    await t.commit();

    for (const filePath of filesToDelete) {
      try {
        fs.unlinkSync(filePath);
      } catch (err) {
        logger.warn("No se pudo borrar archivo al desactivar car", { filePath, err });
      }
    }

    return res.status(200).json(response.successResponse(null, "Car desactivado"));
  } catch (err) {
    try {
      await t.rollback();
    } catch (rollbackErr) {
      logger.error("Error en rollback desactivar car", rollbackErr);
    }
    logger.error("Error al desactivar car", err);
    return res.status(500).json(response.errorResponse("Error al desactivar car", err));
  }
};

const activateCar = async (req, res) => {
  const response = new ApiResponse();
  const { car_id } = req.params;
  try {
    const item = await Car.findByPk(car_id);
    if (!item) return res.status(404).json(response.errorResponse("No encontrado"));
    item.status = true;
    await item.save();
    return res.status(200).json(response.successResponse(null, "Car activado"));
  } catch (err) {
    logger.error("Error al activar car", err);
    return res.status(500).json(response.errorResponse("Error al activar car", err));
  }
};

module.exports = { listCars, createCar, updateCar, deactivateCar, activateCar };
