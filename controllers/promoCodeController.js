'use strict';
const { models, sequelize } = require('../db');
const { Op, ForeignKeyConstraintError } = require('sequelize');
const logger = require('../utils/logger');
const ApiResponse = require('../utils/apiResponse');
const {
  listPromoCodesSchema,
  createPromoCodeSchema,
  updatePromoCodeSchema,
  promoCodeIdParamSchema,
  promoCodeAssignSchema,
} = require('../schemas/promoCodeSchema');

const { promo_codes: PromoCode, promotions: Promotion, customers: Customer } = models;

const promoCodeIncludes = [
  {
    model: Customer,
    as: 'customer',
    attributes: ['customer_id', 'first_name', 'last_name', 'phone'],
  },
];

const listPromoCodes = async (req, res) => {
  const response = new ApiResponse();
  const queryPayload = {
    promo_code: req.query.promo_code,
    customer_id: req.query.customer_id,
    status: req.query.status,
    start_date_from: req.query.start_date_from,
    start_date_to: req.query.start_date_to,
    end_date_from: req.query.end_date_from,
    end_date_to: req.query.end_date_to,
  };

  const { error, value } = listPromoCodesSchema.validate(queryPayload, { abortEarly: false, stripUnknown: true });
  if (error) {
    logger.warn('Parámetros inválidos al listar códigos promocionales', error);
    return res.status(400).json(response.errorResponse('Parámetros inválidos', error.details));
  }

  const where = {};
  if (typeof value.status !== 'undefined') where.status = value.status;
  if (value.promo_code) where.promo_code = { [Op.like]: `%${value.promo_code}%` };
  if (value.customer_id) where.customer_id = value.customer_id;

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
    const items = await PromoCode.findAll({
      where,
      include: promoCodeIncludes,
      order: [['promo_code_id', 'DESC']],
    });

    logger.info('Códigos promocionales listados exitosamente');
    return res.status(200).json(response.successResponse(items, 'Códigos promocionales listados exitosamente'));
  } catch (err) {
    logger.error('Error al listar códigos promocionales', err);
    return res.status(500).json(response.errorResponse('Error al listar códigos promocionales', err));
  }
};

const getPromoCode = async (req, res) => {
  const response = new ApiResponse();
  const { promo_code_id } = req.params;
  const paramResult = promoCodeIdParamSchema.validate(promo_code_id);
  if (paramResult.error) {
    logger.warn('ID inválido al obtener código promocional', paramResult.error);
    return res.status(400).json(response.errorResponse('ID inválido', paramResult.error.details));
  }
  const promoCodeId = Number(promo_code_id);

  try {
    const item = await PromoCode.findByPk(promoCodeId, { include: promoCodeIncludes });
    if (!item) {
      return res.status(404).json(response.errorResponse('Código promocional no encontrado'));
    }

    logger.info('Código promocional obtenido exitosamente', { promo_code_id: promoCodeId });
    return res.status(200).json(response.successResponse(item, 'Código promocional obtenido exitosamente'));
  } catch (err) {
    logger.error('Error al obtener código promocional', err);
    return res.status(500).json(response.errorResponse('Error al obtener código promocional', err));
  }
};

const createPromoCode = async (req, res) => {
  const response = new ApiResponse();
  const { error, value } = createPromoCodeSchema.validate(req.body, { abortEarly: false, stripUnknown: true });
  if (error) {
    logger.warn('Datos inválidos al crear código promocional', error);
    return res.status(400).json(response.errorResponse('Datos inválidos', error.details));
  }
  const t = await sequelize.transaction();
  try {
    const customer = await Promise.all([
      Customer.findByPk(value.customer_id, {t}),
    ]);

    if (!customer) {
      if (!transaction.finished) await transaction.rollback();
      return res.status(404).json(response.errorResponse('Cliente asociado no encontrado'));
    }

    const existingCode = await PromoCode.findOne({ where: { promo_code: value.promo_code }, t });
    if (existingCode) {
      return res.status(409).json(response.errorResponse('El código promocional ya existe'));
    }

    const payload = {
      promo_code: value.promo_code,
      customer_id: value.customer_id,
      discount_type: value.discount_type ?? 'percentage',
      discount_value: value.discount_value,
      min_purchase_amount: typeof value.min_purchase_amount === 'undefined' ? 0 : value.min_purchase_amount,
      max_discount_amount: typeof value.max_discount_amount === 'undefined' ? null : value.max_discount_amount,
      start_date: value.start_date,
      end_date: value.end_date,
      status: typeof value.status === 'undefined' ? true : value.status,
    };

    const created = await PromoCode.create(payload, {t});
    const result = await PromoCode.findByPk(created.promo_code_id, { include: promoCodeIncludes, t });

    logger.info('Código promocional creado exitosamente', { promo_code_id: created.promo_code_id });
    return res.status(201).json(response.successResponse(result, 'Código promocional creado exitosamente'));
  } catch (err) {
    if (!t.finished) await t.rollback();
    logger.error('Error al crear código promocional', err);
    return res.status(500).json(response.errorResponse('Error al crear código promocional', err));
  }
};

const updatePromoCode = async (req, res) => {
  const response = new ApiResponse();
  const { promo_code_id } = req.params;
  const paramResult = promoCodeIdParamSchema.validate(promo_code_id);
  if (paramResult.error) {
    logger.warn('ID inválido al actualizar código promocional', paramResult.error);
    return res.status(400).json(response.errorResponse('ID inválido', paramResult.error.details));
  }
  const promoCodeId = Number(promo_code_id);

  const { error, value } = updatePromoCodeSchema.validate(req.body, { abortEarly: false, stripUnknown: true });
  if (error) {
    logger.warn('Datos inválidos al actualizar código promocional', error);
    return res.status(400).json(response.errorResponse('Datos inválidos', error.details));
  }

  try {
    const item = await PromoCode.findByPk(promoCodeId);
    if (!item) {
      return res.status(404).json(response.errorResponse('Código promocional no encontrado'));
    }

    if (value.promotion_id) {
      const promotion = await Promotion.findByPk(value.promotion_id);
      if (!promotion) {
        return res.status(404).json(response.errorResponse('Promoción asociada no encontrada'));
      }
    }

    if (value.customer_id) {
      const customer = await Customer.findByPk(value.customer_id);
      if (!customer) {
        return res.status(404).json(response.errorResponse('Cliente asociado no encontrado'));
      }
    }

    if (value.promo_code) {
      const duplicated = await PromoCode.findOne({
        where: {
          promo_code: value.promo_code,
          promo_code_id: { [Op.ne]: promoCodeId },
        },
      });
      if (duplicated) {
        return res.status(409).json(response.errorResponse('El código promocional ya existe'));
      }
    }

    const startCandidate = value.start_date ? new Date(value.start_date) : item.start_date;
    const endCandidate = value.end_date ? new Date(value.end_date) : item.end_date;
    if (startCandidate && endCandidate && endCandidate < startCandidate) {
      return res.status(400).json(response.errorResponse('La fecha de fin debe ser posterior o igual a la fecha de inicio'));
    }

    await item.update(value);
    const result = await PromoCode.findByPk(promoCodeId, { include: promoCodeIncludes });

    logger.info('Código promocional actualizado exitosamente', { promo_code_id: promoCodeId });
    return res.status(200).json(response.successResponse(result, 'Código promocional actualizado exitosamente'));
  } catch (err) {
    logger.error('Error al actualizar código promocional', err);
    return res.status(500).json(response.errorResponse('Error al actualizar código promocional', err));
  }
};

const deletePromoCode = async (req, res) => {
  const response = new ApiResponse();
  const { promo_code_id } = req.params;
  const paramResult = promoCodeIdParamSchema.validate(promo_code_id);
  if (paramResult.error) {
    logger.warn('ID inválido al eliminar código promocional', paramResult.error);
    return res.status(400).json(response.errorResponse('ID inválido', paramResult.error.details));
  }
  const promoCodeId = Number(promo_code_id);

  try {
    const item = await PromoCode.findByPk(promoCodeId);
    if (!item) {
      return res.status(404).json(response.errorResponse('Código promocional no encontrado'));
    }

    await item.destroy();

    logger.info('Código promocional eliminado exitosamente', { promo_code_id: promoCodeId });
    return res.status(200).json(response.successResponse(null, 'Código promocional eliminado exitosamente'));
  } catch (err) {
    if (err instanceof ForeignKeyConstraintError) {
      logger.warn('No se puede eliminar código promocional con relaciones activas', { promo_code_id: promoCodeId });
      return res.status(409).json(response.errorResponse('No se puede eliminar el código promocional porque tiene registros asociados'));
    }

    logger.error('Error al eliminar código promocional', err);
    return res.status(500).json(response.errorResponse('Error al eliminar código promocional', err));
  }
};

const assignPromoCodeCustomer = async (req, res) => {
  const response = new ApiResponse();
  const { promo_code_id } = req.params;
  const paramResult = promoCodeIdParamSchema.validate(promo_code_id);
  if (paramResult.error) {
    logger.warn('ID inválido al asignar código promocional', paramResult.error);
    return res.status(400).json(response.errorResponse('ID inválido', paramResult.error.details));
  }
  const promoCodeId = Number(promo_code_id);

  const { error, value } = promoCodeAssignSchema.validate(req.body, { abortEarly: false, stripUnknown: true });
  if (error) {
    logger.warn('Datos inválidos al asignar código promocional', error);
    return res.status(400).json(response.errorResponse('Datos inválidos', error.details));
  }

  try {
    const [promoCode, customer] = await Promise.all([
      PromoCode.findByPk(promoCodeId),
      Customer.findByPk(value.customer_id),
    ]);

    if (!promoCode) {
      return res.status(404).json(response.errorResponse('Código promocional no encontrado'));
    }

    if (!customer) {
      return res.status(404).json(response.errorResponse('Cliente no encontrado'));
    }

    await promoCode.update({ customer_id: value.customer_id });
    const result = await PromoCode.findByPk(promoCodeId, { include: promoCodeIncludes });

    logger.info('Código promocional asignado a cliente', { promo_code_id: promoCodeId, customer_id: value.customer_id });
    return res.status(200).json(response.successResponse(result, 'Código promocional asignado correctamente'));
  } catch (err) {
    logger.error('Error al asignar código promocional', err);
    return res.status(500).json(response.errorResponse('Error al asignar código promocional', err));
  }
};

module.exports = {
  listPromoCodes,
  getPromoCode,
  createPromoCode,
  updatePromoCode,
  deletePromoCode,
  assignPromoCodeCustomer,
};
