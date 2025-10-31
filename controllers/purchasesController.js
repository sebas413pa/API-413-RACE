'use strict';

const {models} = require('../db');
const {sequelize} = require('../db')
const {purchases: Purchase, purchase_details: PurchaseDetail} = models;
const ApiResponse = require('../utils/apiResponse');
const {purchaseBaseSchema, purchaseDetailBaseSchema, listPurchaseSchema} = require('../schemas/purchaseSchema');
const logger = require('../utils/logger');
const {increaseStock, decreaseStock} = require('../services/stockService');
const {createBatch} = require('../services/batchService');
const {createMovement} = require('../services/movementService');
const { Op } = require('sequelize');
const {getBranchFilter, getBranchForCreate} = require('../utils/branchFilter');
const {updatePrice} = require('../services/supplyService');
const { registerLog } = require('../services/logService');

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
                    model: models.entry_details,
                    as: 'entry_details',
                    include: [
                        {
                            model: models.supplies,
                            as: 'supply',
                            attributes: ['supply_id', 'supply_name']
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
    let error, value
    if(user.branch_id == 1)
    {
        ({ error, value } = entryCentralSchema.validate(req.body));
    }
    else
    {
        ({error, value} = entryDistrictSchema.validate(req.body));
    }


    if (error) {
        logger.error("Datos inválidos", error);
        return res.status(400).json(response.errorResponse("Datos inválidos", error));
    }

    const transaction = await sequelize.transaction();

    try {
                
        const branch_id = getBranchForCreate(user, value.branch_id);
        const entryExist = await Entry.findOne({
            where: {
                reference_document: value.reference_document,
                status: 1
            }, transaction
        })
        console.log(entryExist)
        if(entryExist)
        {
            logger.warn("Entrada repetida")
            return res.status(400).json(response.errorResponse("Ya existe una entrada con este número de documento"))
        }
        const createdEntry = await Entry.create({
            entry_date: value.entry_date,
            reference_document: value.reference_document,
            branch_id: branch_id
        }, { transaction });

        let total = 0;
        for (const detail of value.details) {
            if(branch_id == 1)
            {
                const subtotal = detail.entry_price * detail.unit_quantity;
                total += subtotal;
            }

            const createdDetail = await Detail.create({
                ...detail,
                entry_id: createdEntry.entry_id
            }, { transaction });

            await increaseStock(detail.supply_id, branch_id, detail.unit_quantity, transaction);

            const stock = await Stock.findOne({
                where: {
                    supply_id: detail.supply_id,
                    branch_id: branch_id
                },
                transaction
            });

            const batchObject = {
                batch_code: detail.batch_code,
                quantity: detail.unit_quantity,
                expiration_date: detail.expiration_date,
                stock_id: stock.stock_id,
                entry_id: createdEntry.entry_id
            };

            const createdBatch = await createBatch(batchObject, transaction);

            const movementObject = {
                movement_direction: 'Entrada',
                quantity: detail.unit_quantity,
                movement_date: value.entry_date,
                unit_price: detail.entry_price || null,
                movement_type_id: 1,
                entry_detail_id: createdDetail.entry_detail_id,
                supply_id: detail.supply_id,
                branch_id: branch_id,
                batch_id: createdBatch.batch_id
            }
            if(branch_id == 1)
            {
                await updatePrice(detail.supply_id, detail.entry_price, transaction)

            }
            await createMovement(movementObject, transaction)
        }

        await createdEntry.update({ total }, { transaction });



        await transaction.commit();

        const entry = await Entry.findOne({
            where: { entry_id: createdEntry.entry_id },
            include: [
                {
                    model: models.branches,
                    as: 'branch',
                    attributes: ['branch_id', 'branch_name', 'branch_type_id']
                },
                {
                    model: models.entry_details,
                    as: 'entry_details',
                    include: [
                        {
                            model: models.supplies,
                            as: 'supply',
                            attributes: ['supply_id', 'supply_name']
                        }
                    ]
                }
            ]
        });
        await registerLog(req, 'CREACIÓN DE ENTRADA', `CREACIÓN DE ENTRADA CON DÓCUMENTO DE REFERENCIA: "${createdEntry.reference_document}"`);
        logger.info("Se agregó la entrada", entry);
        res.status(201).json(response.successResponse(entry, "Se agregó la entrada"));
    } catch (error) {
        if (!transaction.finished) await transaction.rollback();
        logger.error("Error al agregar la entrada", error);
        res.status(500).json(response.errorResponse("Error al agregar la entrada", error));
    }
};

const cancelEntry = async (req, res) => {
    const entryId = req.params.entry_id;
    const transaction = await sequelize.transaction();
    const response = new ApiResponse();
    
    try
    {
        const entry = await Entry.findOne({
            where:{
                entry_id: entryId,
                status: 1
            }, transaction});
        if(!entry)
        {
            logger.warn("No existe la entrada");
            return res.status(200).json(response.errorResponse("No existe la entrada"))
        }

        await entry.update({
            status: 0
        }, {transaction})
        const details = await Detail.findAll({
            where:{
                entry_id: entry.entry_id
            }, transaction   
        })
        for(const detail of details)
        {
            await decreaseStock(detail.supply_id, entry.branch_id, detail.unit_quantity     , transaction);

            console.log('id detalle', detail.entry_detail_id)
            const movement = await Movement.findOne({
                where: {
                    entry_detail_id: detail.entry_detail_id
                }, transaction
            })
            await movement.update({
                    status:0
                }, {transaction});
        }

        const batches = await Batch.findAll({
            where:{
                entry_id: entry.entry_id
            }, transaction
        })

        for(const batch of batches){
            await batch.update({
                status: 0
            }, {transaction})
        }
        const entry_details = await Detail.findAll({
            where: {
                entry_id: entry.entry_id
            },
            transaction,
        });
            for(const detail of entry_details){
                const supplyExists = await Supply.findByPk(detail.supply_id, {transaction});
                const past_detail = await Detail.findOne({
                    where:{
                        supply_id: detail.supply_id
                    },
                    order: [['createdAt', 'DESC']],
                    offset: 1,
                    transaction,
                    status: 1
                });

                if (past_detail) {
                await supplyExists.update(
                    { unit_price: past_detail.entry_price },
                    { transaction }
                );
                } else {
                    await detail.update(
                    { unit_price: 0 },
                    { transaction }
                );

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