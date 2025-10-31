'use strict';
const { Op } = require('sequelize');
const { models } = require('../db');
const {promotions: Promotion, promotion_products: PromotionProduct,products: Product,cars: Car,} = models;
const logger = require('../utils/logger');
const ApiResponse = require('../utils/apiResponse');
const {
  listPromotionsSchema,
  createPromotionSchema,
  updatePromotionSchema,
  promotionIdParamSchema,
  assignPromotionTargetSchema,
  promotionProductIdParamSchema,
} = require('../schemas/promotionSchema');

const listPromotions = async (req, res) => {
  const response = new ApiResponse();
  const queryPayload = {
    status: req.query.status,
    promotion_name: req.query.promotion_name,
    start_date_from: req.query.start_date_from,
    start_date_to: req.query.start_date_to,
    end_date_from: req.query.end_date_from,
    end_date_to: req.query.end_date_to,
  };

  const { error, value } = listPromotionsSchema.validate(queryPayload, { abortEarly: false, stripUnknown: true });
  if (error) return res.status(400).json(response.errorResponse('Parámetros inválidos', error.details));

  const where = {};
  if (typeof value.status !== 'undefined') where.status = value.status;
  if (value.promotion_name) where.promotion_name = { [Op.like]: `%${value.promotion_name}%` };
  if (value.start_date_from || value.start_date_to) {
    where.start_date = {};
    if (value.start_date_from) where.start_date[Op.gte] = value.start_date_from;
    if (value.start_date_to) where.start_date[Op.lte] = value.start_date_to;
  }
  if (value.end_date_from || value.end_date_to) {
    where.end_date = {};
    if (value.end_date_from) where.end_date[Op.gte] = value.end_date_from;
    if (value.end_date_to) where.end_date[Op.lte] = value.end_date_to;
  }

  try {
    const items = await Promotion.findAll({
      where,
      include: [
        {
          model: PromotionProduct,
          as: 'promotion_products',
          include: [
            { model: Product, as: 'product', attributes: ['product_id', 'name', 'sale_price', 'status'] },
            { model: Car, as: 'car', attributes: ['car_id', 'car_name', 'price', 'status'] },
          ],
        },
      ],
      order: [['promotion_id', 'DESC']],
    });

    return res.status(200).json(response.successResponse(items, 'Promociones obtenidas exitosamente'));
  } catch (err) {
    logger.error('Error al listar promociones', err);
    return res.status(500).json(response.errorResponse('Error al listar promociones', err));
  }
};

const createPromotion = async (req, res) => {
  const response = new ApiResponse();
  const payload = {
    promotion_name: req.body.promotion_name,
    discount_type: req.body.discount_type,
    discount_value: req.body.discount_value,
    start_date: req.body.start_date,
    end_date: req.body.end_date,
    status: req.body.status,
  };

  const { error, value } = createPromotionSchema.validate(payload);
  if (error) return res.status(400).json(response.errorResponse('Datos inválidos', error.details));

  try {
    if (!value.discount_type) value.discount_type = 'percentage';
    const item = await Promotion.create(value);
    return res.status(201).json(response.successResponse(item, 'Promoción creada exitosamente'));
  } catch (err) {
    logger.error('Error al crear promoción', err);
    return res.status(500).json(response.errorResponse('Error al crear promoción', err));
  }
};

const updatePromotion = async (req, res) => {
  const response = new ApiResponse();
  const { promotion_id } = req.params;
  const paramResult = promotionIdParamSchema.validate(promotion_id);
  if (paramResult.error) return res.status(400).json(response.errorResponse('ID inválido', paramResult.error.details));
  const promotionId = Number(promotion_id);

  const payload = {
    promotion_name: req.body.promotion_name,
    discount_type: req.body.discount_type,
    discount_value: req.body.discount_value,
    start_date: req.body.start_date,
    end_date: req.body.end_date,
    status: req.body.status,
  };

  const { error, value } = updatePromotionSchema.validate(payload, { abortEarly: false, stripUnknown: true });
  if (error) return res.status(400).json(response.errorResponse('Datos inválidos', error.details));

  if (!Object.keys(value).length) {
    return res.status(400).json(response.errorResponse('Debe proporcionar al menos un campo para actualizar'));
  }

  try {
  const item = await Promotion.findByPk(promotionId);
    if (!item) return res.status(404).json(response.errorResponse('Promoción no encontrada'));

    const startCandidate = value.start_date ? new Date(value.start_date) : item.start_date;
    const endCandidate = value.end_date ? new Date(value.end_date) : item.end_date;
    if (startCandidate && endCandidate && endCandidate < startCandidate) {
      return res.status(400).json(response.errorResponse('La fecha de fin debe ser posterior a la fecha de inicio'));
    }

  const updated = await item.update(value);
    return res.status(200).json(response.successResponse(updated, 'Promoción actualizada exitosamente'));
  } catch (err) {
    logger.error('Error al actualizar promoción', err);
    return res.status(500).json(response.errorResponse('Error al actualizar promoción', err));
  }
};

const deactivatePromotion = async (req, res) => {
  const response = new ApiResponse();
  const { promotion_id } = req.params;
  const paramResult = promotionIdParamSchema.validate(promotion_id);
  if (paramResult.error) return res.status(400).json(response.errorResponse('ID inválido', paramResult.error.details));
  const promotionId = Number(promotion_id);

  try {
  const item = await Promotion.findByPk(promotionId);
    if (!item) return res.status(404).json(response.errorResponse('Promoción no encontrada'));
    item.status = false;
    await item.save();
    return res.status(200).json(response.successResponse(null, 'Promoción desactivada exitosamente'));
  } catch (err) {
    logger.error('Error al desactivar promoción', err);
    return res.status(500).json(response.errorResponse('Error al desactivar promoción', err));
  }
};

const activatePromotion = async (req, res) => {
  const response = new ApiResponse();
  const { promotion_id } = req.params;
  const paramResult = promotionIdParamSchema.validate(promotion_id);
  if (paramResult.error) return res.status(400).json(response.errorResponse('ID inválido', paramResult.error.details));
  const promotionId = Number(promotion_id);

  try {
  const item = await Promotion.findByPk(promotionId);
    if (!item) return res.status(404).json(response.errorResponse('Promoción no encontrada'));
    item.status = true;
    await item.save();
    return res.status(200).json(response.successResponse(null, 'Promoción activada exitosamente'));
  } catch (err) {
    logger.error('Error al activar promoción', err);
    return res.status(500).json(response.errorResponse('Error al activar promoción', err));
  }
};

const assignPromotionTarget = async (req, res) => {
  const response = new ApiResponse();
  const { promotion_id } = req.params;
  const paramResult = promotionIdParamSchema.validate(promotion_id);
  if (paramResult.error) return res.status(400).json(response.errorResponse('ID inválido', paramResult.error.details));
  const promotionId = Number(promotion_id);

  const { error, value } = assignPromotionTargetSchema.validate(req.body, { abortEarly: false, stripUnknown: true });
  if (error) return res.status(400).json(response.errorResponse('Datos inválidos', error.details));

  try {
  const promotion = await Promotion.findByPk(promotionId);
    if (!promotion) return res.status(404).json(response.errorResponse('Promoción no encontrada'));

    if (value.product_id) {
      const product = await Product.findByPk(value.product_id);
      if (!product) return res.status(404).json(response.errorResponse('Producto no encontrado'));
    }
    if (value.car_id) {
      const car = await Car.findByPk(value.car_id);
      if (!car) return res.status(404).json(response.errorResponse('Vehículo no encontrado'));
    }

  const duplicateWhere = { promotion_id: promotionId };
    if (value.product_id) duplicateWhere.product_id = value.product_id;
    else duplicateWhere.product_id = null;
    if (value.car_id) duplicateWhere.car_id = value.car_id;
    else duplicateWhere.car_id = null;

    const existing = await PromotionProduct.findOne({ where: duplicateWhere });
    if (existing) {
      return res.status(409).json(response.errorResponse('El objetivo ya tiene esta promoción asignada'));
    }

    const created = await PromotionProduct.create({
      promotion_id: promotionId,
      product_id: value.product_id ?? null,
      car_id: value.car_id ?? null,
    });

    const result = await PromotionProduct.findByPk(created.promotion_product_id, {
      include: [
        { model: Product, as: 'product', attributes: ['product_id', 'name', 'sale_price', 'status'] },
        { model: Car, as: 'car', attributes: ['car_id', 'car_name', 'price', 'status'] },
      ],
    });

    return res.status(201).json(response.successResponse(result, 'Promoción asignada exitosamente'));
  } catch (err) {
    logger.error('Error al asignar promoción', err);
    return res.status(500).json(response.errorResponse('Error al asignar promoción', err));
  }
};

const removePromotionTarget = async (req, res) => {
  const response = new ApiResponse();
  const { promotion_id, promotion_product_id } = req.params;
  const promotionResult = promotionIdParamSchema.validate(promotion_id);
  if (promotionResult.error) return res.status(400).json(response.errorResponse('ID de promoción inválido', promotionResult.error.details));
  const promotionId = Number(promotion_id);
  const promotionProductResult = promotionProductIdParamSchema.validate(promotion_product_id);
  if (promotionProductResult.error) return res.status(400).json(response.errorResponse('ID de asignación inválido', promotionProductResult.error.details));
  const promotionProductId = Number(promotion_product_id);

  try {
    const row = await PromotionProduct.findOne({
      where: {
        promotion_product_id: promotionProductId,
  promotion_id: promotionId,
      },
    });

    if (!row) return res.status(404).json(response.errorResponse('Asignación no encontrada'));

    await row.destroy();
    return res.status(200).json(response.successResponse(null, 'Asignación eliminada exitosamente'));
  } catch (err) {
    logger.error('Error al eliminar asignación de promoción', err);
    return res.status(500).json(response.errorResponse('Error al eliminar asignación de promoción', err));
  }
};

module.exports = {
  listPromotions,
  createPromotion,
  updatePromotion,
  deactivatePromotion,
  activatePromotion,
  assignPromotionTarget,
  removePromotionTarget,
};
