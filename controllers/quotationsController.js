'use strict';

const { models } = require('../db');
const { sequelize } = require('../db');
const config = require('../config/config');
const { Op } = require('sequelize');
const ApiResponse = require('../utils/apiResponse');
const logger = require('../utils/logger');
const { sendQuotationEmail } = require('../services/emailService');
const { quotationTemplate } = require('../utils/emailTemplates');
const {
    createQuotationSchema,
    listQuotationSchema,
    quotationStatusSchema,
    QUOTATION_STATUS_VALUES
} = require('../schemas/quotationSchema');
const { default: api } = require('../utils/apiClient');

const {
    quotations: Quotation,
    customers: Customer,
    cars: Car,
    users: User,
    car_images: CarImage
} = models;

const ABSOLUTE_URL_REGEX = /^https?:\/\//i;
const DATA_URL_PREFIX = /^data:/i;

const getAssetBaseUrl = () => {
    const configuredBase = typeof config.assets?.baseUrl === 'string' ? config.assets.baseUrl.trim() : '';
    if (configuredBase.length) {
        return configuredBase.replace(/\/$/, '');
    }

    const protocol = typeof config.protocol === 'string' && config.protocol.trim().length
        ? config.protocol.trim().replace(/:$/, '')
        : 'http';
    const host = typeof config.host === 'string' ? config.host.trim() : '';
    if (!host.length) {
        return null;
    }
    const numericPort = Number(config.port);
    const shouldAppendPort = Number.isFinite(numericPort) && numericPort > 0
        && !((protocol === 'https' && numericPort === 443) || (protocol === 'http' && numericPort === 80));
    const portSegment = shouldAppendPort ? `:${numericPort}` : '';

    return `${protocol}://${host}${portSegment}`;
};

const resolvePublicAssetUrl = (value) => {
    if (typeof value !== 'string') {
        return null;
    }

    const trimmed = value.trim();
    if (!trimmed.length) {
        return null;
    }

    if (ABSOLUTE_URL_REGEX.test(trimmed) || DATA_URL_PREFIX.test(trimmed)) {
        return trimmed;
    }

    const baseUrl = getAssetBaseUrl();
    if (!baseUrl) {
        return null;
    }

    const normalizedPath = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
    return `${baseUrl}${normalizedPath}`;
};
const buildQuotationIncludes = () => ([
    {
        model: Customer,
        as: 'customer',
        attributes: ['customer_id', 'first_name', 'last_name']
    },
    {
        model: Car,
        as: 'car',
        attributes: ['car_id', 'car_name', 'model', 'sale_price']
        ,
        include: [
            {
                model: CarImage,
                as: 'car_images',
                attributes: ['car_image_id', 'image_url', 'is_main', 'status'],
                where: { status: true },
                required: false,
            }
        ]
    }
]);

const findCustomerIdForUser = async(userId, transaction) => {
    if (!userId) {
        return null;
    }

    const query = {
        where: { user_id: userId }
    };

    if (transaction) {
        query.transaction = transaction;
    }

    const customer = await Customer.findOne(query);
    return customer ? customer.customer_id : null;
};

const normalizeTotal = (value) => {
    if (typeof value === 'undefined' || value === null) {
        return null;
    }
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) {
        return null;
    }
    return Number(numeric.toFixed(2));
};

const listQuotations = async(req, res) => {
    const response = new ApiResponse();
    const { error, value } = listQuotationSchema.validate(req.query, { abortEarly: false, stripUnknown: true });

    if (error) {
        logger.warn('Parámetros inválidos al listar cotizaciones', error);
        return res.status(400).json(response.errorResponse('Parámetros inválidos', error));
    }

    const where = {};

    const applyIdFilter = (field, data) => {
        if (Array.isArray(data)) {
            if (data.length) {
                where[field] = { [Op.in]: data };
            }
        } else if (typeof data !== 'undefined' && data !== null) {
            where[field] = data;
        }
    };

    applyIdFilter('quotation_id', value.quotation_id);
    applyIdFilter('customer_id', value.customer_id);
    applyIdFilter('car_id', value.car_id);

    if (value.status) {
        where.status = value.status;
    }

    if (typeof value.is_active !== 'undefined') {
        where.is_active = value.is_active;
    }

    if (req.user?.role === 'Cliente') {
        const customerId = await findCustomerIdForUser(req.user.user_id);
        if (!customerId) {
            logger.warn('Cliente autenticado sin registro al listar cotizaciones', { user_id: req.user.user_id });
            return res.status(403).json(response.errorResponse('Debe completar su registro como cliente'));
        }
        where.customer_id = customerId;
    }

    try {
        const items = await Quotation.findAll({
            where,
            include: buildQuotationIncludes(),
            order: [['quotation_id', 'DESC']]
        });

        logger.info('Cotizaciones listadas exitosamente');
        return res.status(200).json(response.successResponse(items, 'Cotizaciones listadas exitosamente'));
    } catch (err) {
        logger.error('Error al listar cotizaciones', err);
        return res.status(500).json(response.errorResponse('Error al listar cotizaciones', err));
    }
};

const createQuotation = async(req, res) => {
    const response = new ApiResponse();
    const { error, value } = createQuotationSchema.validate(req.body, { abortEarly: false, stripUnknown: true });

    if (error) {
        logger.warn('Datos inválidos al crear cotización', error);
        return res.status(400).json(response.errorResponse('Datos inválidos', error));
    }
    const transaction = await sequelize.transaction();
    try {
        if (!req.user) {
            logger.warn('Intento de crear cotización sin usuario autenticado');
            return res.status(401).json(response.errorResponse('Debe autenticarse para crear cotizaciones'));
        }

        const customerId = await findCustomerIdForUser(req.user.user_id);
        if (!customerId) {
            logger.warn('Usuario autenticado sin registro de cliente al crear cotización', { user_id: req.user.user_id });
            return res.status(403).json(response.errorResponse('Debe completar su registro como cliente antes de crear cotizaciones'));
        }

        const customer = await Customer.findByPk(customerId, {
            include: [{ model: User, as: 'user', attributes: ['email', 'username'] }],
            transaction
        });
        if (!customer) {
            logger.warn('Cliente no encontrado al crear cotización', { customerId });
            return res.status(404).json(response.errorResponse('Cliente no encontrado'));
        }

        const car = await Car.findByPk(value.car_id, {transaction});
        if (!car) {
            logger.warn('Vehículo no encontrado al crear cotización', { car_id: value.car_id });
            return res.status(404).json(response.errorResponse('Vehículo no encontrado'));
        }

        if (car.status === false) {
            logger.warn('Vehículo inactivo al crear cotización', { car_id: value.car_id });
            return res.status(409).json(response.errorResponse('El vehículo seleccionado no está disponible'));
        }

        const normalizedTotal = car.sale_price;

        const createPayload = {
            customer_id: customerId,
            car_id: car.car_id,
            total: normalizedTotal
        };

        if (typeof value.is_active === 'boolean') {
            createPayload.is_active = value.is_active;
        }

        const quotation = await Quotation.create(createPayload, {transaction});

        const created = await Quotation.findOne({
            where: { quotation_id: quotation.quotation_id },
            include: buildQuotationIncludes(),
            transaction
        });

        try {
            const apiPayload = {
                source: "Cotizacion",
                start_date: new Date(),
                client_id:customerId,
                car_id:car.car_id,
                status_id: 5,
                quote_id: quotation.quotation_id,
            };

                const crmResp = await api.post('/leads', apiPayload,{cookies: {
    accessToken,
    refreshToken
  }});
                if (crmResp && crmResp.data && crmResp.data.success === false) {
                    await transaction.rollback();                     
                    return res.status(400).json(response.errorResponse('No se pudo sincronizar con el CRM', crmResp.data));
                }
                await transaction.commit()
            } catch (crmErr) {
                try { if (!transaction.finished) await transaction.rollback(); } catch (rbErr) { logger.error('Rollback failed', rbErr); }
                const status = crmErr.response?.status ?? 502;
                const body = crmErr.response?.data ?? crmErr.message ?? String(crmErr);
                logger.warn('CRM error creating lead', { err: crmErr.message || crmErr, body });
                return res.status(status).json(response.errorResponse('No se pudo sincronizar con el CRM', body));
            }

        const quotationData = created.get({ plain: true });
        const recipientEmail = customer.user?.email;

        if (recipientEmail) {
            const carInfo = quotationData.car
                ? [quotationData.car.car_name, quotationData.car.model].filter(Boolean).join(' ')
                : 'Vehículo pendiente';

            const parsedTotal = quotationData.total !== null && quotationData.total !== undefined
                ? Number(quotationData.total)
                : null;

            const carImages = Array.isArray(quotationData.car?.car_images)
                ? quotationData.car.car_images
                : [];
            const mainCarImage = carImages.find((image) => Boolean(image?.is_main)) || carImages[0] || null;
            const heroImageUrl = resolvePublicAssetUrl(mainCarImage?.image_url) || null;

            const totalDisplay = parsedTotal !== null && Number.isFinite(parsedTotal)
                ? parsedTotal.toFixed(2)
                : 'Pendiente de definir';

            const createdAtValue = quotationData.createdAt ? new Date(quotationData.createdAt) : new Date();
            const createdAtDisplay = Number.isNaN(createdAtValue.getTime())
                ? new Date().toLocaleString('es-ES')
                : createdAtValue.toLocaleString('es-ES');

            const fullName = `${customer.first_name} ${customer.last_name}`.trim();

            const fallbackName = customer.user?.username || 'Piloto';
            const displayName = fullName || fallbackName;
            const hasSpecificOrigin = typeof config.cors?.origin === 'string' && config.cors.origin.trim().length && config.cors.origin !== '*';
            const normalizedOrigin = hasSpecificOrigin
                ? config.cors.origin.trim().replace(/\/$/, '')
                : null;
            const quotationUrl = normalizedOrigin
                ? `${normalizedOrigin}/cotizaciones/${quotationData.quotation_id}`
                : null;

            const html = quotationTemplate({
                customerName: displayName,
                quotationNumber: quotationData.quotation_id,
                carName: carInfo || 'Vehículo pendiente',
                totalDisplay,
                statusLabel: quotationData.status,
                createdAtLabel: createdAtDisplay,
                ctaUrl: quotationUrl,
                heroImageUrl,
            });

            const subject = `Cotización #${quotationData.quotation_id} - ${carInfo || 'Vehículo'}`;

            await sendQuotationEmail({
                to: recipientEmail,
                subject,
                html,
            });
        } else {
            logger.warn('Cliente no tiene correo electrónico asociado, se omite envío de cotización', { customerId });
        }
    logger.info('Cotización creada exitosamente', { quotation_id: quotation.quotation_id });
        return res.status(201).json(response.successResponse(created, 'Cotización creada exitosamente'));
    } catch (err) {
         try { if (!transaction.finished) await transaction.rollback(); } catch (rbErr) { logger.error('Rollback failed', rbErr); }
        logger.error('Error al crear cotización', err);
        return res.status(500).json(response.errorResponse('Error al crear cotización', err));
    }
};

const updateQuotationStatus = async(req, res) => {
    const response = new ApiResponse();
    const quotationId = Number(req.params.quotationId);

    if (!Number.isInteger(quotationId)) {
        logger.warn('Identificador de cotización inválido al actualizar estado', { quotationId: req.params.quotationId });
        return res.status(400).json(response.errorResponse('Identificador de cotización inválido'));
    }

    const { error, value } = quotationStatusSchema.validate(req.body, { abortEarly: false, stripUnknown: true });

    if (error) {
        logger.warn('Datos inválidos al actualizar estado de cotización', error);
        return res.status(400).json(response.errorResponse('Datos inválidos', error));
    }

    const { status } = value;

    if (!QUOTATION_STATUS_VALUES.includes(status)) {
        logger.warn('Estado de cotización no permitido', { quotationId, status });
        return res.status(400).json(response.errorResponse('Estado de cotización no permitido'));
    }

    const transaction = await sequelize.transaction();

    try {
        const quotation = await Quotation.findOne({
            where: { quotation_id: quotationId },
            transaction,
            lock: transaction.LOCK.UPDATE
        });

        if (!quotation) {
            if (!transaction.finished) {
                await transaction.rollback();
            }
            logger.warn('Cotización no encontrada al actualizar estado', { quotationId });
            return res.status(404).json(response.errorResponse('Cotización no encontrada'));
        }

        if (quotation.status === status) {
            if (!transaction.finished) {
                await transaction.rollback();
            }
            logger.info('Cotización ya está en el estado solicitado', { quotationId, status });
            const current = await Quotation.findOne({
                where: { quotation_id: quotationId },
                include: buildQuotationIncludes()
            });
            return res.status(200).json(response.successResponse(current, 'La cotización ya se encuentra en el estado solicitado'));
        }

        await quotation.update({ status }, { transaction });

        await transaction.commit();

        const updated = await Quotation.findOne({
            where: { quotation_id: quotationId },
            include: buildQuotationIncludes()
        });

        logger.info('Estado de cotización actualizado correctamente', { quotationId, status });
        return res.status(200).json(response.successResponse(updated, 'Estado de cotización actualizado correctamente'));
    } catch (err) {
        if (!transaction.finished) {
            await transaction.rollback();
        }
        logger.error('Error al actualizar estado de cotización', err);
        return res.status(500).json(response.errorResponse('Error al actualizar estado de cotización', err));
    }
};

module.exports = {
    listQuotations,
    createQuotation,
    updateQuotationStatus
};
