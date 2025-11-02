'use strict';

const {models} = require('../db');
const {sequelize} = require('../db')
const { Op } = require('sequelize');
const {sales: Sale, sale_details: SaleDetail, customers: Customer, products: Product, cars: Car} = models;
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
    const {error, value} = saleBaseSchema.validate(req.body);
    const user = req.user;
    if(error)
    {
        logger.error("Datos invalidos", error);
        return res.status(400).json(response.errorResponse("Datos invalidos", error));
    }
    const transaction = await sequelize.transaction();
    try
    {
        let customer;
        let customer_id;
        console.log("Usuario", user);
        if(user)
        {
            customer = await Customer.findOne({
                where: {
                    user_id: user.user_id
                }, transaction
            })
            customer_id = customer.customer_id;
        }
        else
        {
            customer_id = null
        }
        const createdSale = await Sale.create({
            customer_id: customer_id,
            sale_date: Date.now(),
            sale_type: 'Producto',
            status: 'Pendiente'
        }, {transaction})
        let total = 0;
        let subtotal = 0;
        for (const detail of value.details)
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
                subtotal = detail.quantity * effectivePrice;
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
                console.log(batch)
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

        await createdSale.update({
            total
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