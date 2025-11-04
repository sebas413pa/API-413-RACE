'use strict';

const { randomUUID } = require('crypto');
const {models} = require('../db');
const {sequelize} = require('../db')
const { Op } = require('sequelize');
const {sales: Sale, sale_details: SaleDetail, customers: Customer, products: Product, cars: Car, promo_codes: PromoCode, promo_code_uses: PromoCodeUse, payments: Payment, batches: Batch, quotations: Quotation} = models;
const ApiResponse = require('../utils/apiResponse');
const logger = require('../utils/logger');
const {saleBaseSchema, listSchema, saleStatusSchema, SALE_STATUS_VALUES, carSaleSchema} = require('../schemas/saleSchema');
const { PEPS, decreaseBatch, restoreBatchStock   } = require('../services/batchService')
const { getProductEffectivePrice } = require('../services/productService');
const { getCarEffectivePrice } = require('../services/carService');

const CARD_PAYMENT_METHODS = new Set(['Tarjeta de Credito', 'Tarjeta de Debito']);

const requiresCardNumber = (paymentMethod) => CARD_PAYMENT_METHODS.has(paymentMethod);

const maskCardNumber = (cardNumber) => {
    if (!cardNumber) {
        return null;
    }

    const digitsOnly = String(cardNumber).replace(/[^0-9]/g, '');
    if (digitsOnly.length < 4) {
        return null;
    }

    const hiddenSection = digitsOnly.slice(0, -4).replace(/\d/g, '*');
    const visibleSection = digitsOnly.slice(-4);
    const combined = `${hiddenSection}${visibleSection}`;

    return combined.replace(/(.{4})/g, '$1 ').trim();
};

const buildSaleIncludes = () => ([
    {
        model: SaleDetail,
        as: 'sale_details',
        include: [
            {
                model: Product,
                as: 'product',
                attributes: ['product_id', 'name']
            },
            {
                model: Car,
                as: 'car',
                attributes: ['car_id', 'car_name']
            }
        ]
    },
    {
        model: Customer,
        as: 'customer',
        attributes: ['customer_id', 'first_name', 'last_name']
    },
    {
        model: PromoCodeUse,
        as: 'promo_code_uses',
        attributes: ['use_id', 'discount_amount', 'status'],
        include: [
            {
                model: PromoCode,
                as: 'promo_code',
                attributes: ['promo_code_id', 'promo_code']
            }
        ]
    },
    {
        model: Payment,
        as: 'payments',
        attributes: ['payment_id', 'payment_method', 'amount', 'status', 'payment_date', 'transaction_id', 'notes', 'card_number']
    }
]);

const fetchSaleWithRelations = async(saleId, options = {}) => {
    const { transaction, lock } = options;
    const query = {
        where: { sale_id: saleId },
        include: buildSaleIncludes()
    };

    if (transaction) {
        query.transaction = transaction;
    }

    if (lock) {
        query.lock = lock;
    }

    return Sale.findOne(query);
};



const listSales = async(req, res) =>{
    const response = new ApiResponse();
    const { error, value } = listSchema.validate(req.query, { abortEarly: false, stripUnknown: true });
    if (error) {
        logger.error('Parámetros inválidos al listar ventas', error);
        return res.status(400).json(response.errorResponse('Parámetros inválidos', error));
    }

    const { sale_id, car_id, product_id, customer_id: customerIdFilter, start_date, end_date, active } = value;
    const saleWhere = {};
    const detailWhere = {};
    const user = req.user;

    if (sale_id) saleWhere.sale_id = sale_id;
    if (active) saleWhere.status = active;
    if (start_date || end_date) {
        saleWhere.sale_date = {};
        if (start_date) saleWhere.sale_date[Op.gte] = start_date;
        if (end_date) saleWhere.sale_date[Op.lte] = end_date;
    }

    const applyIdFilter = (target, field, data) => {
        if (Array.isArray(data)) {
            if (data.length) target[field] = { [Op.in]: data };
        } else if (typeof data !== 'undefined') {
            target[field] = data;
        }
    };

    if (typeof car_id !== 'undefined') applyIdFilter(detailWhere, 'car_id', car_id);
    if (typeof product_id !== 'undefined') applyIdFilter(detailWhere, 'product_id', product_id);

    const saleIncludes = buildSaleIncludes();
    const [includeSaleDetails, ...otherIncludes] = saleIncludes;
    if (Object.keys(detailWhere).length) {
        includeSaleDetails.where = detailWhere;
        includeSaleDetails.required = true;
    }

    try {
        if (user?.role === 'Cliente') {
            const customer = await Customer.findOne({ where: { user_id: user.user_id } });
            if (!customer) {
                logger.warn('Cliente autenticado sin registro asociado al listar ventas', { user_id: user.user_id });
                return res.status(404).json(response.errorResponse('Cliente no encontrado'));
            }
            saleWhere.customer_id = customer.customer_id;
        } else if (customerIdFilter) {
            saleWhere.customer_id = customerIdFilter;
        }

        const items = await Sale.findAll({
            where: saleWhere,
            include: [
                includeSaleDetails,
                ...otherIncludes
            ],
            order: [['sale_id', 'DESC']]
        });

        logger.info('Ventas listadas exitosamente');
        return res.status(200).json(response.successResponse(items, 'Ventas listadas exitosamente'));
    } catch (err) {
        logger.error('Error al listar ventas', err);
        return res.status(500).json(response.errorResponse('Error al listar ventas', err));
    }
};

const createdSale = async(req, res) => {
    const response = new ApiResponse()
    const {error, value} = saleBaseSchema.validate(req.body, { abortEarly: false, stripUnknown: true });
    const user = req.user;
    if(error)
    {
        logger.error("Datos invalidos", error);
        return res.status(400).json(response.errorResponse("Datos invalidos", error));
    }
    const { details, promo_code: promoCodeInput, payment } = value;
    const needsCardNumber = requiresCardNumber(payment.payment_method);
    const rawCardNumber = payment.card_number;
    let maskedCardNumber = null;

    if (needsCardNumber) {
        maskedCardNumber = maskCardNumber(rawCardNumber);
        if (!maskedCardNumber) {
            logger.warn('Número de tarjeta inválido después de la validación', { payment_method: payment.payment_method });
            return res.status(400).json(response.errorResponse('Número de tarjeta inválido'));
        }
    }

    if (typeof payment.card_number !== 'undefined') {
        delete payment.card_number;
    }

    const transaction = await sequelize.transaction();
    try
    {
        let customer_id;
        if(user)
        {
            const customer = await Customer.findOne({
                where: {
                    user_id: user.user_id
                }, transaction
            });

            if (customer) {
                customer_id = customer.customer_id;
            } else {
                logger.warn("Usuario autenticado sin registro de cliente", { user_id: user.user_id });
            }
            customer_id = customer ? customer.customer_id : null;
        }
        else
        {
            customer_id = null
        }
        const createdSale = await Sale.create({
            customer_id: customer_id,
            sale_date: new Date(),
            sale_type: 'Producto',
            status: 'Pendiente',
            subtotal: 0,
            discount: 0,
            total: 0
        }, {transaction})
        let subtotal = 0;
        let discountTotal = 0;
        for (const detail of details)
        {
            const { product, price: effectivePrice } = await getProductEffectivePrice(detail.product_id, transaction);
            if (effectivePrice === null) {
                if (!transaction.finished) {
                    await transaction.rollback();
                }
                logger.warn('Producto sin precio de venta válido', { product_id: detail.product_id });
                return res.status(400).json(response.errorResponse('Producto sin precio de venta válido'));
            }
            const baseUnitPrice = Number(product.sale_price);
            if (!Number.isFinite(baseUnitPrice)) {
                if (!transaction.finished) {
                    await transaction.rollback();
                }
                logger.warn('Producto sin precio base válido', { product_id: detail.product_id, sale_price: product.sale_price });
                return res.status(400).json(response.errorResponse('Producto sin precio base válido'));
            }
            if(product.stock >= detail.quantity)
            {
                const lineSubtotal = Number((baseUnitPrice * detail.quantity).toFixed(2));
                const lineTotal = Number((effectivePrice * detail.quantity).toFixed(2));
                const lineDiscount = Math.max(Number((lineSubtotal - lineTotal).toFixed(2)), 0);

                subtotal += lineSubtotal;
                discountTotal += lineDiscount;
                await SaleDetail.create({
                    sale_id: createdSale.sale_id,
                    product_id: detail.product_id,
                    quantity: detail.quantity,
                    unit_price: effectivePrice,
                    subtotal: lineTotal
                }, {transaction})
                const newStock = product.stock - detail.quantity
                await product.update({
                    stock: newStock
                }, {transaction})
                const batch = await PEPS(null, product.product_id, transaction);
                await decreaseBatch(batch.batch_id, detail.quantity, transaction)
            }
            else
            {
                if (!transaction.finished) {
                    await transaction.rollback()
                }
                logger.warn("No hay stock suficiente")
                return res.status(400).json(response.errorResponse("No hay stock suficiente"))
            }
        }
        const subtotalRounded = Number(subtotal.toFixed(2));
        const lineDiscountRounded = Number(discountTotal.toFixed(2));
        let total = Math.max(Number((subtotalRounded - lineDiscountRounded).toFixed(2)), 0);
        let promoDiscount = 0;

        if (promoCodeInput) {
            const promoCode = await PromoCode.findOne({
                where: { promo_code: promoCodeInput },
                transaction,
            });

            if (!promoCode) {
                if (!transaction.finished) {
                    await transaction.rollback();
                }
                logger.warn("Código promocional no encontrado", { promo_code: promoCodeInput });
                return res.status(404).json(response.errorResponse("Código promocional no encontrado"));
            }

            if (!promoCode.status) {
                if (!transaction.finished) {
                    await transaction.rollback();
                }
                logger.warn("Código promocional inactivo", { promo_code_id: promoCode.promo_code_id });
                return res.status(409).json(response.errorResponse("Código promocional inactivo"));
            }

            if (!customer_id) {
                if (!transaction.finished) {
                    await transaction.rollback();
                }
                logger.warn("Intento de usar código sin cliente asociado", { promo_code_id: promoCode.promo_code_id });
                return res.status(409).json(response.errorResponse("Debe autenticarse como cliente para usar este código"));
            }

            if (promoCode.customer_id && promoCode.customer_id !== customer_id) {
                if (!transaction.finished) {
                    await transaction.rollback();
                }
                logger.warn("Código promocional no pertenece al cliente", { promo_code_id: promoCode.promo_code_id, customer_id });
                return res.status(403).json(response.errorResponse("Este código promocional no está asignado a este cliente"));
            }

            const now = new Date();
            const startDate = promoCode.start_date ? new Date(promoCode.start_date) : null;
            const endDate = promoCode.end_date ? new Date(promoCode.end_date) : null;

            if (startDate && now < startDate) {
                if (!transaction.finished) {
                    await transaction.rollback();
                }
                logger.warn("Código promocional aún no disponible", { promo_code_id: promoCode.promo_code_id });
                return res.status(409).json(response.errorResponse("El código promocional aún no está disponible"));
            }

            if (endDate && now > endDate) {
                if (!transaction.finished) {
                    await transaction.rollback();
                }
                logger.warn("Código promocional expirado", { promo_code_id: promoCode.promo_code_id });
                return res.status(409).json(response.errorResponse("El código promocional ha expirado"));
            }

            const existingUse = await PromoCodeUse.findOne({
                where: {
                    promo_code_id: promoCode.promo_code_id,
                    status: true,
                },
                transaction,
            });

            if (existingUse) {
                if (!transaction.finished) {
                    await transaction.rollback();
                }
                logger.warn("Código promocional ya utilizado", { promo_code_id: promoCode.promo_code_id });
                return res.status(409).json(response.errorResponse("El código promocional ya fue utilizado"));
            }

            const minPurchase = promoCode.min_purchase_amount ? parseFloat(promoCode.min_purchase_amount) : 0;
            if (minPurchase && total < minPurchase) {
                if (!transaction.finished) {
                    await transaction.rollback();
                }
                logger.warn("Total insuficiente para código promocional", { promo_code_id: promoCode.promo_code_id, total, minPurchase });
                return res.status(409).json(response.errorResponse("El total de la compra no cumple con el mínimo requerido para el código"));
            }

            if (promoCode.discount_type === 'percentage') {
                promoDiscount = (total * parseFloat(promoCode.discount_value)) / 100;
            } else {
                promoDiscount = parseFloat(promoCode.discount_value);
            }

            const maxDiscount = promoCode.max_discount_amount != null ? parseFloat(promoCode.max_discount_amount) : null;
            if (maxDiscount !== null) {
                promoDiscount = Math.min(promoDiscount, maxDiscount);
            }

            promoDiscount = Math.min(promoDiscount, total);
            promoDiscount = Number(promoDiscount.toFixed(2));
            total = Math.max(Number((total - promoDiscount).toFixed(2)), 0);

            await PromoCodeUse.create({
                promo_code_id: promoCode.promo_code_id,
                customer_id,
                sale_id: createdSale.sale_id,
                discount_amount: promoDiscount,
                status: true,
            }, { transaction });
        }

        const discountCombined = Number((lineDiscountRounded + promoDiscount).toFixed(2));
        const paymentAmount = Number(payment.amount);
        const paymentAmountRounded = Number(paymentAmount.toFixed(2));

        if (Math.abs(paymentAmountRounded - total) > 0.01) {
            if (!transaction.finished) {
                await transaction.rollback();
            }
            logger.warn('Monto de pago no coincide con el total calculado', { paymentAmount: paymentAmountRounded, total });
            return res.status(400).json(response.errorResponse('El monto del pago debe coincidir con el total de la venta',{ paymentAmount: paymentAmountRounded, total } ));
        }

        const paymentStatus = 'Aprobado';
        const transactionId = randomUUID();

        const paymentPayload = {
            sale_id: createdSale.sale_id,
            payment_method: payment.payment_method,
            amount: paymentAmountRounded,
            status: paymentStatus,
            transaction_id: transactionId,
            notes: payment.notes ? payment.notes : null,
            card_number: maskedCardNumber,
        };

        await createdSale.update({
            subtotal: subtotalRounded,
            discount: discountCombined,
            total
        }, {transaction})

        await Payment.create(paymentPayload, { transaction });

        await transaction.commit();
        const finalSale = await fetchSaleWithRelations(createdSale.sale_id);
        logger.info("Se hizo la venta", finalSale)
        res.status(201).json(response.successResponse(finalSale, "Venta hecha correctamente"))
    }
    catch(error)
    {
        if (!transaction.finished) {
            await transaction.rollback();
        }
        logger.error("Hubo un error al hacer la venta", error)
        res.status(500).json(response.errorResponse("Hubo un error al hacer la venta", error))
    }
}

const createCarSale = async(req, res) => {
    const response = new ApiResponse();
    const { error, value } = carSaleSchema.validate(req.body, { abortEarly: false, stripUnknown: true });

    if (error) {
        logger.warn('Datos inválidos al crear venta de vehículo', error);
        return res.status(400).json(response.errorResponse('Datos inválidos', error));
    }

    const { customer_id: customerId, quotation_id: quotationId, promo_code: promoCodeInput, payment, details } = value;
    const needsCardNumber = requiresCardNumber(payment.payment_method);
    const rawCardNumber = payment.card_number;
    let maskedCardNumber = null;

    if (needsCardNumber) {
        maskedCardNumber = maskCardNumber(rawCardNumber);
        if (!maskedCardNumber) {
            logger.warn('Número de tarjeta inválido para venta de vehículo', { payment_method: payment.payment_method });
            return res.status(400).json(response.errorResponse('Número de tarjeta inválido'));
        }
    }

    if (typeof payment.card_number !== 'undefined') {
        delete payment.card_number;
    }
    const vehicleDetail = details[0];
    const quantity = Number(vehicleDetail.quantity || 1);
    const manualSalePriceRaw = vehicleDetail.sale_price;
    const hasManualSalePrice = manualSalePriceRaw !== undefined && manualSalePriceRaw !== null;

    const transaction = await sequelize.transaction();

    try {
        const customer = await Customer.findOne({
            where: { customer_id: customerId },
            transaction,
            lock: transaction.LOCK.UPDATE
        });

        if (!customer) {
            if (!transaction.finished) {
                await transaction.rollback();
            }
            logger.warn('Cliente no encontrado al crear venta de vehículo', { customerId });
            return res.status(404).json(response.errorResponse('Cliente no encontrado'));
        }

    if (customer.status === false || customer.status === 0) {
            if (!transaction.finished) {
                await transaction.rollback();
            }
            logger.warn('Cliente inactivo al crear venta de vehículo', { customerId });
            return res.status(409).json(response.errorResponse('El cliente se encuentra inactivo'));
        }

        let linkedQuotation = null;
        if (quotationId) {
            linkedQuotation = await Quotation.findOne({
                where: { quotation_id: quotationId },
                transaction,
                lock: transaction.LOCK.UPDATE
            });

            if (!linkedQuotation) {
                if (!transaction.finished) {
                    await transaction.rollback();
                }
                logger.warn('Cotización no encontrada para venta de vehículo', { quotationId });
                return res.status(404).json(response.errorResponse('Cotización no encontrada'));
            }

            if (linkedQuotation.customer_id !== customerId) {
                if (!transaction.finished) {
                    await transaction.rollback();
                }
                logger.warn('Cotización no pertenece al cliente indicado', { quotationId, customerId });
                return res.status(409).json(response.errorResponse('La cotización seleccionada no pertenece al cliente')); 
            }
        }

        const car = await Car.findOne({
            where: { car_id: vehicleDetail.car_id },
            transaction,
            lock: transaction.LOCK.UPDATE
        });

        if (!car) {
            if (!transaction.finished) {
                await transaction.rollback();
            }
            logger.warn('Vehículo no encontrado al crear venta', { car_id: vehicleDetail.car_id });
            return res.status(404).json(response.errorResponse('Vehículo no encontrado'));
        }

    if (car.status === false || car.status === 0) {
            if (!transaction.finished) {
                await transaction.rollback();
            }
            logger.warn('Vehículo inactivo al crear venta', { car_id: car.car_id });
            return res.status(409).json(response.errorResponse('El vehículo no está disponible para la venta'));
        }

        if (car.stock < quantity) {
            if (!transaction.finished) {
                await transaction.rollback();
            }
            logger.warn('Stock insuficiente para vehículo', { car_id: car.car_id, requested: quantity, stock: car.stock });
            return res.status(400).json(response.errorResponse('No hay stock suficiente del vehículo solicitado'));
        }

        const baseUnitPrice = Number(car.sale_price);
        if (!Number.isFinite(baseUnitPrice) || baseUnitPrice < 0) {
            if (!transaction.finished) {
                await transaction.rollback();
            }
            logger.warn('Vehículo sin precio de venta válido', { car_id: car.car_id, sale_price: car.sale_price });
            return res.status(400).json(response.errorResponse('Vehículo sin precio de venta válido'));
        }

        if (hasManualSalePrice && promoCodeInput) {
            if (!transaction.finished) {
                await transaction.rollback();
            }
            logger.warn('Intento de combinar precio manual con código promocional', { car_id: car.car_id, promo_code: promoCodeInput });
            return res.status(409).json(response.errorResponse('No se puede aplicar un código promocional cuando se especifica un precio de venta manual'));
        }

        let lineSubtotal;
        let lineTotal;
        let lineDiscount = 0;
        let unitPriceForDetail;

        if (hasManualSalePrice) {
            const manualSalePrice = Number(manualSalePriceRaw);
            if (!Number.isFinite(manualSalePrice) || manualSalePrice <= 0) {
                if (!transaction.finished) {
                    await transaction.rollback();
                }
                logger.warn('Precio de venta manual inválido', { car_id: car.car_id, sale_price: manualSalePriceRaw });
                return res.status(400).json(response.errorResponse('El precio de venta especificado no es válido'));
            }

            unitPriceForDetail = Number(manualSalePrice.toFixed(2));
            lineSubtotal = Number((unitPriceForDetail * quantity).toFixed(2));
            lineTotal = lineSubtotal;
        } else {
            const { price: effectiveUnitPrice } = await getCarEffectivePrice(car.car_id, transaction, car);

            if (effectiveUnitPrice === null) {
                if (!transaction.finished) {
                    await transaction.rollback();
                }
                logger.warn('Vehículo sin precio de venta efectivo', { car_id: car.car_id });
                return res.status(400).json(response.errorResponse('Vehículo sin precio de venta válido'));
            }

            unitPriceForDetail = Number(effectiveUnitPrice.toFixed(2));
            lineSubtotal = Number((baseUnitPrice * quantity).toFixed(2));
            lineTotal = Number((unitPriceForDetail * quantity).toFixed(2));
            lineDiscount = Math.max(Number((lineSubtotal - lineTotal).toFixed(2)), 0);
        }

        const createdSale = await Sale.create({
            customer_id: customerId,
            quotation_id: quotationId || null,
            sale_date: new Date(),
            sale_type: 'Vehiculo',
            status: 'Pendiente',
            subtotal: 0,
            discount: 0,
            total: 0
        }, { transaction });

        await SaleDetail.create({
            sale_id: createdSale.sale_id,
            car_id: car.car_id,
            quantity,
            unit_price: unitPriceForDetail,
            subtotal: lineTotal
        }, { transaction });

        const newStock = Number(car.stock) - quantity;
        await car.update({ stock: newStock }, { transaction });

        if (quantity > 0) {
            const batch = await PEPS(car.car_id, null, transaction);
            await decreaseBatch(batch.batch_id, quantity, transaction);
        }

        const subtotalRounded = lineSubtotal;
        let total = lineTotal;
        const paymentAmountRounded = Number(Number(payment.amount).toFixed(2));
        let promoDiscount = 0;

        if (!hasManualSalePrice && promoCodeInput) {
            const promoCode = await PromoCode.findOne({
                where: { promo_code: promoCodeInput },
                transaction,
            });

            if (!promoCode) {
                if (!transaction.finished) {
                    await transaction.rollback();
                }
                logger.warn('Código promocional no encontrado', { promo_code: promoCodeInput });
                return res.status(404).json(response.errorResponse('Código promocional no encontrado'));
            }

            if (!promoCode.status) {
                if (!transaction.finished) {
                    await transaction.rollback();
                }
                logger.warn('Código promocional inactivo', { promo_code_id: promoCode.promo_code_id });
                return res.status(409).json(response.errorResponse('Código promocional inactivo'));
            }

            if (promoCode.customer_id && promoCode.customer_id !== customerId) {
                if (!transaction.finished) {
                    await transaction.rollback();
                }
                logger.warn('Código promocional no pertenece al cliente', { promo_code_id: promoCode.promo_code_id, customerId });
                return res.status(403).json(response.errorResponse('Este código promocional no está asignado a este cliente'));
            }

            const now = new Date();
            const startDate = promoCode.start_date ? new Date(promoCode.start_date) : null;
            const endDate = promoCode.end_date ? new Date(promoCode.end_date) : null;

            if (startDate && now < startDate) {
                if (!transaction.finished) {
                    await transaction.rollback();
                }
                logger.warn('Código promocional aún no disponible', { promo_code_id: promoCode.promo_code_id });
                return res.status(409).json(response.errorResponse('El código promocional aún no está disponible'));
            }

            if (endDate && now > endDate) {
                if (!transaction.finished) {
                    await transaction.rollback();
                }
                logger.warn('Código promocional expirado', { promo_code_id: promoCode.promo_code_id });
                return res.status(409).json(response.errorResponse('El código promocional ha expirado'));
            }

            const existingUse = await PromoCodeUse.findOne({
                where: {
                    promo_code_id: promoCode.promo_code_id,
                    status: true,
                },
                transaction,
            });

            if (existingUse) {
                if (!transaction.finished) {
                    await transaction.rollback();
                }
                logger.warn('Código promocional ya utilizado', { promo_code_id: promoCode.promo_code_id });
                return res.status(409).json(response.errorResponse('El código promocional ya fue utilizado'));
            }

            const minPurchase = promoCode.min_purchase_amount ? parseFloat(promoCode.min_purchase_amount) : 0;
            if (minPurchase && total < minPurchase) {
                if (!transaction.finished) {
                    await transaction.rollback();
                }
                logger.warn('Total insuficiente para código promocional', { promo_code_id: promoCode.promo_code_id, total, minPurchase });
                return res.status(409).json(response.errorResponse('El total de la compra no cumple con el mínimo requerido para el código'));
            }

            if (promoCode.discount_type === 'percentage') {
                promoDiscount = (total * parseFloat(promoCode.discount_value)) / 100;
            } else {
                promoDiscount = parseFloat(promoCode.discount_value);
            }

            const maxDiscount = promoCode.max_discount_amount != null ? parseFloat(promoCode.max_discount_amount) : null;
            if (maxDiscount !== null) {
                promoDiscount = Math.min(promoDiscount, maxDiscount);
            }

            promoDiscount = Math.min(promoDiscount, total);
            promoDiscount = Number(promoDiscount.toFixed(2));
            total = Math.max(Number((total - promoDiscount).toFixed(2)), 0);

            await PromoCodeUse.create({
                promo_code_id: promoCode.promo_code_id,
                customer_id: customerId,
                sale_id: createdSale.sale_id,
                discount_amount: promoDiscount,
                status: true,
            }, { transaction });
        }

        const discountCombined = Number((lineDiscount + promoDiscount).toFixed(2));

        if (Math.abs(paymentAmountRounded - total) > 0.01) {
            if (!transaction.finished) {
                await transaction.rollback();
            }
            logger.warn('Monto de pago no coincide con el total de la venta de vehículo', { paymentAmount: paymentAmountRounded, total });
            return res.status(400).json(response.errorResponse('El monto del pago debe coincidir con el total de la venta', { paymentAmount: paymentAmountRounded, total }));
        }

        const paymentPayload = {
            sale_id: createdSale.sale_id,
            payment_method: payment.payment_method,
            amount: paymentAmountRounded,
            status: 'Aprobado',
            transaction_id: randomUUID(),
            notes: payment.notes ? payment.notes : null,
            card_number: maskedCardNumber,
        };

        await createdSale.update({
            subtotal: subtotalRounded,
            discount: discountCombined,
            total
        }, { transaction });

        await Payment.create(paymentPayload, { transaction });

        if (linkedQuotation && linkedQuotation.status !== 'Completada') {
            await linkedQuotation.update({ status: 'Completada' }, { transaction });
        }

        await transaction.commit();

        const finalSale = await fetchSaleWithRelations(createdSale.sale_id);
        logger.info('Venta de vehículo creada exitosamente', { sale_id: createdSale.sale_id });
        return res.status(201).json(response.successResponse(finalSale, 'Venta de vehículo creada exitosamente'));
    } catch (err) {
        if (!transaction.finished) {
            await transaction.rollback();
        }
        logger.error('Error al crear venta de vehículo', err);
        return res.status(500).json(response.errorResponse('Error al crear la venta de vehículo', err));
    }
};

const cancelSale = async(req, res) => {
    const response = new ApiResponse();
    const saleId = Number(req.params.saleId);

    if (!Number.isInteger(saleId)) {
        logger.warn('Identificador de venta inválido al cancelar', { saleId: req.params.saleId });
        return res.status(400).json(response.errorResponse('Identificador de venta inválido'));
    }

    const transaction = await sequelize.transaction();

    try {
    const sale = await fetchSaleWithRelations(saleId, { transaction, lock: transaction.LOCK.UPDATE });

        if (!sale) {
            if (!transaction.finished) {
                await transaction.rollback();
            }
            logger.warn('Venta no encontrada al cancelar', { saleId });
            return res.status(404).json(response.errorResponse('Venta no encontrada'));
        }

        if (sale.status === 'Cancelada') {
            if (!transaction.finished) {
                await transaction.rollback();
            }
            logger.warn('Venta ya cancelada', { saleId });
            return res.status(409).json(response.errorResponse('La venta ya se encuentra cancelada'));
        }

        if (req.user?.role === 'Cliente') {
            const customerQuery = {
                where: { user_id: req.user.user_id },
                transaction
            };

            if (transaction) {
                customerQuery.lock = transaction.LOCK.UPDATE;
            }

            const customer = await Customer.findOne(customerQuery);

            if (!customer || customer.customer_id !== sale.customer_id) {
                if (!transaction.finished) {
                    await transaction.rollback();
                }
                logger.warn('Cliente intentó cancelar una venta que no le pertenece', { saleId, userId: req.user.user_id });
                return res.status(403).json(response.errorResponse('No está autorizado para cancelar esta venta'));
            }
        }

        for (const detail of sale.sale_details) {
            const quantity = Number(detail.quantity) || 0;
            if (!quantity) {
                continue;
            }

            if (detail.product_id) {
                await Product.increment('stock', {
                    by: quantity,
                    where: { product_id: detail.product_id },
                    transaction
                });
                await restoreBatchStock({ productId: detail.product_id, quantity, transaction });
            }

            if (detail.car_id) {
                await Car.increment('stock', {
                    by: quantity,
                    where: { car_id: detail.car_id },
                    transaction
                });
                await restoreBatchStock({ carId: detail.car_id, quantity, transaction });
            }

            if (detail.status !== false) {
                await detail.update({ status: false }, { transaction });
            }
        }

        for (const promoUse of sale.promo_code_uses) {
            if (promoUse.status !== false) {
                await promoUse.update({ status: false }, { transaction });
            }
        }

        for (const payment of sale.payments) {
            if (payment.status !== 'Reembolsado') {
                const notePrefix = payment.notes ? `${payment.notes} | ` : '';
                await payment.update({
                    status: 'Reembolsado',
                    notes: `${notePrefix}Reembolso generado por cancelación de la venta ${saleId}`
                }, { transaction });
            }
        }

        await sale.update({ status: 'Cancelada' }, { transaction });

        await transaction.commit();

        const updatedSale = await fetchSaleWithRelations(saleId);
        logger.info('Venta cancelada correctamente', { saleId });
        return res.status(200).json(response.successResponse(updatedSale, 'Venta cancelada correctamente'));
    } catch (err) {
        if (!transaction.finished) {
            await transaction.rollback();
        }
        logger.error('Error al cancelar la venta', err);
        return res.status(500).json(response.errorResponse('Error al cancelar la venta', err));
    }
};

const updateSaleStatus = async(req, res) => {
    const response = new ApiResponse();
    const saleId = Number(req.params.saleId);

    if (!Number.isInteger(saleId)) {
        logger.warn('Identificador de venta inválido al actualizar estado', { saleId: req.params.saleId });
        return res.status(400).json(response.errorResponse('Identificador de venta inválido'));
    }

    const { error, value } = saleStatusSchema.validate(req.body, { abortEarly: false, stripUnknown: true });
    if (error) {
        logger.warn('Datos inválidos al actualizar estado de venta', error);
        return res.status(400).json(response.errorResponse('Datos inválidos', error));
    }

    const { status } = value;

    if (status === 'Cancelada') {
        logger.info('Solicitud de actualización de estado a cancelada redirigida a cancelSale', { saleId });
        return cancelSale(req, res);
    }

    if (!SALE_STATUS_VALUES.includes(status)) {
        logger.warn('Estado de venta no permitido', { saleId, status });
        return res.status(400).json(response.errorResponse('Estado de venta no permitido'));
    }

    const transaction = await sequelize.transaction();

    try {
        const sale = await Sale.findOne({
            where: { sale_id: saleId },
            transaction,
            lock: transaction.LOCK.UPDATE
        });

        if (!sale) {
            if (!transaction.finished) {
                await transaction.rollback();
            }
            logger.warn('Venta no encontrada al actualizar estado', { saleId });
            return res.status(404).json(response.errorResponse('Venta no encontrada'));
        }

        if (sale.status === 'Cancelada') {
            if (!transaction.finished) {
                await transaction.rollback();
            }
            logger.warn('Intento de actualizar una venta cancelada', { saleId });
            return res.status(409).json(response.errorResponse('No es posible actualizar una venta cancelada'));
        }

        if (sale.status === status) {
            if (!transaction.finished) {
                await transaction.rollback();
            }
            logger.info('Venta ya se encuentra en el estado solicitado', { saleId, status });
            const currentSale = await fetchSaleWithRelations(saleId);
            return res.status(200).json(response.successResponse(currentSale, 'La venta ya se encuentra en el estado solicitado'));
        }

        await sale.update({ status }, { transaction });

        await transaction.commit();

        const updatedSale = await fetchSaleWithRelations(saleId);
        logger.info('Estado de venta actualizado correctamente', { saleId, status });
        return res.status(200).json(response.successResponse(updatedSale, 'Estado de venta actualizado correctamente'));
    } catch (err) {
        if (!transaction.finished) {
            await transaction.rollback();
        }
        logger.error('Error al actualizar el estado de la venta', err);
        return res.status(500).json(response.errorResponse('Error al actualizar el estado de la venta', err));
    }
};


module.exports = {listSales, createdSale, createCarSale, cancelSale, updateSaleStatus}