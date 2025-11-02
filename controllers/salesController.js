'use strict';

const {models} = require('../db');
const {sequelize} = require('../db')
const { Op } = require('sequelize');
const {sales: Sale, sale_details: SaleDetail, customers: Customer, products: Product, cars: Car, promo_codes: PromoCode, promo_code_uses: PromoCodeUse} = models;
const ApiResponse = require('../utils/apiResponse');
const logger = require('../utils/logger');
const {saleBaseSchema, listSchema} = require('../schemas/saleSchema');
const {createBatch, PEPS, decreaseBatch, increaseBatch} = require('../services/batchService')
const { getProductEffectivePrice } = require('../services/productService');

const listSales = async(req, res) =>{
    const response = new ApiResponse();
    const { error, value } = listSchema.validate(req.query, { abortEarly: false, stripUnknown: true });
    if (error) {
        logger.error('Parámetros inválidos al listar ventas', error);
        return res.status(400).json(response.errorResponse('Parámetros inválidos', error));
    }

    const { sale_id, car_id, product_id, customer_id, start_date, end_date, active } = value;
    const saleWhere = {};
    const detailWhere = {};

    if (sale_id) saleWhere.sale_id = sale_id;
    if (customer_id) saleWhere.customer_id = customer_id;
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

    const includeSaleDetails = {
        model: SaleDetail,
        as: 'sale_details',
        include: [
            { model: Product, as: 'product', attributes: ['product_id', 'name'] },
            { model: Car, as: 'car', attributes: ['car_id', 'car_name'] },
        ],
    };

    if (Object.keys(detailWhere).length) {
        includeSaleDetails.where = detailWhere;
        includeSaleDetails.required = true;
    }

    try {
        const items = await Sale.findAll({
            where: saleWhere,
            include: [
                includeSaleDetails,
                { model: Customer, as: 'customer', attributes: ['customer_id', 'first_name', 'last_name'] },
            ],
            order: [['sale_id', 'DESC']],
        });

        logger.info('Ventas listadas exitosamente');
        return res.status(200).json(response.successResponse(items, 'Ventas listadas exitosamente'));
    } catch (err) {
        logger.error('Error al listar ventas', err);
        return res.status(500).json(response.errorResponse('Error al listar ventas', err));
    }
}

const createdSale = async(req, res) => {
    const response = new ApiResponse()
    const {error, value} = saleBaseSchema.validate(req.body, { abortEarly: false, stripUnknown: true });
    const user = req.user;
    if(error)
    {
        logger.error("Datos invalidos", error);
        return res.status(400).json(response.errorResponse("Datos invalidos", error));
    }
    const { details, promo_code: promoCodeInput } = value;
    const transaction = await sequelize.transaction();
    try
    {
        let customer_id = null;
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
        }
        const createdSale = await Sale.create({
            customer_id: customer_id,
            sale_date: Date.now(),
            sale_type: 'Producto',
            status: 'Pendiente'
        }, {transaction})
        let total = 0;
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
            if(product.stock >= detail.quantity)
            {
                const subtotal = detail.quantity * effectivePrice;
                total += subtotal;
                await SaleDetail.create({
                    sale_id: createdSale.sale_id,
                    product_id: detail.product_id,
                    quantity: detail.quantity,
                    unit_price: effectivePrice,
                    subtotal: subtotal
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

        const totalBeforeDiscount = total;
        let finalTotal = totalBeforeDiscount;
        let discountAmount = 0;

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

            const alreadyUsed = await PromoCodeUse.findOne({
                where: {
                    promo_code_id: promoCode.promo_code_id,
                    status: true,
                },
                transaction,
            });

            if (alreadyUsed) {
                if (!transaction.finished) {
                    await transaction.rollback();
                }
                logger.warn("Código promocional ya utilizado", { promo_code_id: promoCode.promo_code_id });
                return res.status(409).json(response.errorResponse("El código promocional ya fue utilizado"));
            }

            const minPurchase = promoCode.min_purchase_amount ? parseFloat(promoCode.min_purchase_amount) : 0;
            if (minPurchase && totalBeforeDiscount < minPurchase) {
                if (!transaction.finished) {
                    await transaction.rollback();
                }
                logger.warn("Total insuficiente para código promocional", { promo_code_id: promoCode.promo_code_id, totalBeforeDiscount, minPurchase });
                return res.status(409).json(response.errorResponse("El total de la compra no cumple con el mínimo requerido para el código"));
            }

            if (promoCode.discount_type === 'percentage') {
                discountAmount = (totalBeforeDiscount * parseFloat(promoCode.discount_value)) / 100;
            } else {
                discountAmount = parseFloat(promoCode.discount_value);
            }

            const maxDiscount = promoCode.max_discount_amount != null ? parseFloat(promoCode.max_discount_amount) : null;
            if (maxDiscount !== null) {
                discountAmount = Math.min(discountAmount, maxDiscount);
            }

            discountAmount = Math.min(discountAmount, totalBeforeDiscount);
            discountAmount = Number(discountAmount.toFixed(2));
            finalTotal = Number((totalBeforeDiscount - discountAmount).toFixed(2));
            finalTotal = Math.max(finalTotal, 0);

            await PromoCodeUse.create({
                promo_code_id: promoCode.promo_code_id,
                customer_id,
                sale_id: createdSale.sale_id,
                discount_amount: discountAmount,
                status: true,
            }, { transaction });
        }

        await createdSale.update({
            total: finalTotal
        }, {transaction})

        await transaction.commit();
        const finalSale = await Sale.findOne({
            where:{
                sale_id: createdSale.sale_id
            },
            include: [
                {
                    model: models.sale_details,
                    as: 'sale_details',
                    include: [
                        {
                            model: models.products,
                            as: 'product',
                            attributes: ['product_id', 'name']
                        }
                    ]
                },
                {
                    model: Customer,
                    as: 'customer',
                    attributes: ['customer_id', 'first_name', 'last_name']
                },
                {
                    model: models.promo_code_uses,
                    as: 'promo_code_uses',
                    attributes: ['use_id', 'discount_amount', 'status'],
                    include: [
                        {
                            model: models.promo_codes,
                            as: 'promo_code',
                            attributes: ['promo_code_id', 'promo_code']
                        }
                    ]
                }
            ]
        })
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

module.exports = {listSales, createdSale}