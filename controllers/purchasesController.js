'use strict';

const {models} = require('../db');
const {sequelize} = require('../db')
const {purchases: Purchase, purchase_details: PurchaseDetail, employees: Employee, cars: Car, products: Product, batches:Batch} = models;
const ApiResponse = require('../utils/apiResponse');
const {purchaseBaseSchema, purchaseDetailBaseSchema, listPurchaseSchema} = require('../schemas/purchaseSchema');
const logger = require('../utils/logger');
const {createBatch} = require('../services/batchService');
const { Op } = require('sequelize');
const {updateCarPrice} = require('../services/carService')
const {updateProductPrice} = require('../services/productService')
const listEntries = async (req, res) => {
    
    const user = req.user
    const response = new ApiResponse();
    const {error, value } = listPurchaseSchema.validate(req.query);
    if(error) {
        return res.status(400).json(response.errorResponse('Datos de la query invalidos', error));
    }

    const {purchase_id, car_id, product_id, supplier_id, start_date, end_date} = value;
    let where = {};

    if(purchase_id) where.purchase_id = purchase_id;
    if(car_id) {
        where.car_id = Array.isArray(car_id) ? car_id : car_id;
    }
    if (value.start_date && value.end_date) {
        where.purchase_date = {
            [Op.between]: [value.start_date, value.end_date]
        };
    } else if (value.start_date) {
        where.purchase_date = {
            [Op.gte]: value.start_date
        };
    } else if (value.end_date) {
        where.purchase_date = {
            [Op.lte]: value.end_date
        };
    }

    try {
        const entries = await Purchase.findAll({
            where,
            include: [
                {
                    model: models.purchase_details,
                    as: 'purchase_details',
                    include: [
                        {
                            model: models.cars,
                            as: 'car',
                            attributes: ['car_id', 'car_name']
                        }
                    ]
                }
            ]
        });

        logger.info('Entries obtenidas exitosamente', entries);
        return res.status(200).json(response.successResponse(entries, 'Entradas listadas exitosamente'));
    }
    catch(error) {
        logger.error('Error al listar las entradas', error);
        return res.status(500).json(response.errorResponse('Error al listar las entradas', error));
    }
};

const createEntry = async (req, res) => {                                                                                                                
    
    const user = req.user
    const response = new ApiResponse();
    const { error, value } = purchaseBaseSchema.validate(req.body)

    if (error) {
        logger.error("Datos inválidos", error);
        return res.status(400).json(response.errorResponse("Datos inválidos", error));
    }

    const transaction = await sequelize.transaction();

    try {
        const employee = await Employee.findOne({
            where: {
                user_id: user.user_id
            }, transaction
        })
        if(!employee)
        {
            logger.warn("No se encuentra al empleado")
            await transaction.rollback()
            return res.status(404).json(response.errorResponse("No se encontro al empleado"))
        }
        console.log(employee)
        const createdEntry = await Purchase.create({
            purchase_date: value.purchase_date,
            supplier_id: value.supplier_id,
            employee_id: employee.employee_id
        }, { transaction });

        let total = 0;
        for (const detail of value.details) {
            const subtotal = detail.unit_price * detail.quantity;
            total += subtotal;
            const createdDetail = await PurchaseDetail.create({
                ...detail,
                subtotal: subtotal,
                purchase_id: createdEntry.purchase_id
            }, { transaction });

            if(detail.car_id)
            {
                const carExists = await Car.findByPk(detail.car_id)
                const newStock = carExists.stock + detail.quantity
                await carExists.update({
                    stock:newStock
                }, {transaction})
                await updateCarPrice(carExists.car_id, detail.unit_price, transaction)
            }
            if(detail.product_id)
            {
                const productExists = await Product.findByPk(detail.product_id)
                const newStock = productExists.stock + detail.quantity
                await productExists.update({
                    stock:newStock
                }, {transaction})
                
            }

            const batchObject = {
                product_id: detail.product_id ?? null,
                car_id: detail.car_id ?? null,
                supplier_id: value.supplier_id,
                purchase_id: createdEntry.purchase_id,
                batch_code: detail.batch_code
                    || `PUR-${createdEntry.purchase_id}-${detail.car_id ?? detail.product_id}-${createdDetail.purchase_detail_id}`,
                quantity: detail.quantity
            };

            await createBatch(batchObject, transaction);
        }

        await createdEntry.update({ total }, { transaction });

        await transaction.commit();

        const entry = await Purchase.findOne({
            where: { purchase_id: createdEntry.purchase_id },
            include: [
                {
                    model: models.purchase_details,
                    as: 'purchase_details',
                    include: [
                        {
                            model: models.products,
                            as: 'product',
                            attributes: ['product_id', 'name']
                        },
                        {
                            model: models.cars,
                            as: 'car',
                            attributes: ['car_id', 'car_name']
                        }
                    ]
                }
            ]
        });
        logger.info("Se agregó la entrada", entry);
        res.status(201).json(response.successResponse(entry, "Se agregó la entrada"));
    } catch (error) {
        if (!transaction.finished) await transaction.rollback();
        logger.error("Error al agregar la entrada", error);
        res.status(500).json(response.errorResponse("Error al agregar la entrada", error));
    }
};

const cancelEntry = async (req, res) => {
    const purchaseId = req.params.purchase_id;
    const transaction = await sequelize.transaction();
    const response = new ApiResponse();
    
    try
    {
        const entry = await Purchase.findOne({
            where:{
                purchase_id: purchaseId,
            }, transaction});
        if(!entry)
        {
            logger.warn("No existe la compra");
            return res.status(200).json(response.errorResponse("No existe la entrada"))
        }

        const details = await PurchaseDetail.findAll({
            where:{
                purchase_id: entry.purchase_id
            }, transaction   
        })
        for(const detail of details)
        {
             if(detail.car_id)
            {
                const carExists = await Car.findByPk(detail.car_id)
                const newStock = carExists.stock - detail.quantity
                await carExists.update({
                    stock:newStock
                }, {transaction})
            }
            if(detail.product_id)
            {
                const productExists = await Product.findByPk(detail.product_id)
                const newStock = productExists.stock - detail.quantity
                await productExists.update({
                    stock:newStock
                }, {transaction})
            }
        }

        const batches = await Batch.findAll({
            where:{
                purchase_id: entry.purchase_id
            }, transaction
        })

        for(const batch of batches){
            await batch.update({
                available_qty: 0
            }, {transaction})
        }
        const entry_details = await PurchaseDetail.findAll({
            where: {
                purchase_id: entry.purchase_id
            },
            transaction,
        });
            for(const detail of entry_details){
                if(detail.product_id)
                {
                    const productExists = await Product.findByPk(detail.product_id, {transaction});
                    const past_detail = await PurchaseDetail.findOne({
                        where:{
                            product_id: detail.product_id
                        },
                        order: [['createdAt', 'DESC']],
                        offset: 1,
                        transaction
                    });

                    if (past_detail) {
                        await updateProductPrice(productExists.product_id, past_detail.unit_price, transaction)
                    } else {
                        await productExists.update(
                        { purchase_price: 0,
                          sale_price: 0
                        },
                        { transaction }
                    );

                    }
                }

                if(detail.car_id)
                {
                    const carExists = await Car.findByPk(detail.car_id, {transaction});
                    const past_detail = await PurchaseDetail.findOne({
                        where:{
                            car_id: detail.car_id
                        },
                        order: [['createdAt', 'DESC']],
                        offset: 1,
                        transaction
                    });

                    if (past_detail) {
                        await updateCarPrice(carExists.car_id, past_detail.unit_price, transaction)
                    } else {
                        await carExists.update(
                        { purchase_price: 0,
                          sale_price: 0
                        },
                        { transaction }
                    );

                    }
                }
                
        }

        await transaction.commit();
        logger.info("Se ha anulado la entrada")
        await registerLog(req, 'ANULACIÓN DE ENTRADA', `ANULACIÓN DE ENTRADA CON DÓCUMENTO DE REFERENCIA: "${entry.reference_document}"`);
        res.status(200).json(response.successResponse(null, "Se ha anulado la entrada"));
    }catch(error)
    {
        if (!transaction.finished) await transaction.rollback();
        logger.error("Error al anular la entrada", error);
        res.status(500).json(response.errorResponse("Error al anular la entrada", error));
    }
};

module.exports = {listEntries, createEntry, cancelEntry}