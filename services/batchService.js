const { models, sequelize } = require('../db');
const logger = require('../utils/logger');
const Batch = models.batches;
const {createBatchSchema} = require('../schemas/batchSchema');
const { Op } = require('sequelize');
const { ExceptionHandler } = require('winston');


const normalizeNumber = (v) => (v === undefined || v === null || v === '' ? undefined : Number(v));

async function createBatch(batchObject, transaction) {
    const payload = {
        ...batchObject,
        product_id: normalizeNumber(batchObject.product_id),
        car_id: normalizeNumber(batchObject.car_id),
        supplier_id: normalizeNumber(batchObject.supplier_id),
        purchase_id: normalizeNumber(batchObject.purchase_id),
        quantity: normalizeNumber(batchObject.quantity),
    };

    const {error, value} = createBatchSchema.validate(payload);

    if(error)
    {
        logger.error("Datos de lote invalidos", error)
        throw new Error("Datos de lote invalidos", error)
    }
    try
    {
        const batch = await Batch.create({
            batch_code: value.batch_code,
            quantity: value.quantity,
            available_qty: value.quantity,
            purchase_id: value.purchase_id,
            supplier_id: value.supplier_id,
            car_id: value.car_id || null,
            product_id: value.product_id || null,
            received_at: Date.now()
        }, {transaction})
        logger.info("Lote creado", batch);
        return batch; 

    }
    catch(error)
    {
        logger.error("Hubo un error al crear el lote", error);
        throw ("Hubo un error al crear el lote", error);
    }
};

async function PEPS(carId,productId, transaction) {
    const where = {};

    if (carId) {
        where.car_id = carId;
    }
    else if (productId) {
        where.product_id = productId;
    }
    console.log("Id del producto del lote", productId)
    where.available_qty =  { [Op.gt]: 0 }   
    where.status = 1 
    try
    {
        const batchPEPS = await Batch.findOne({
            where,
            order: [['received_at', 'ASC']],
            transaction
        })

        if(!batchPEPS)
        {
            logger.warn("No se encontro un lote valido para el insumo")
            throw new Error("No se encontro un lote valido para el insumo")
        }

        return batchPEPS
    }
    catch(error)
    {
        logger.error("Hubo un error al obtener el lote", error)
        throw error
    }
};

async function decreaseBatch(batchId, quantity, transaction) {
    try{
        const batch = await Batch.findOne({
            where:{
                available_qty: {[Op.gt]: 0},
                batch_id: batchId
            },
            transaction
        })

        if(!batch)
        {
            logger.error("No existe el lote")
            throw new Error("No existe el lote");
        }
        let decreaseQty = quantity;
        let remainingQty = 0
        if (batch.available_qty < quantity) {
            decreaseQty = batch.available_qty
            remainingQty = quantity - decreaseQty
        }
        const newQuantity = batch.available_qty - decreaseQty
        await batch.update({
            available_qty: newQuantity
        }, {transaction})

        if(batch.remainingQty == 0){
            await batch.update({
                status:0
            }, {transaction});
        }

        logger.info("Lote disminuido")
        return {
            batch: await batch.reload({ transaction }),
            remainingQty
        };
    }
    catch(error){
        logger.error("Ha ocurrido un error al disminuir el lote")
        throw error;
    }
};

async function increaseBatch(batch_id, qty, transaction){
    const batchExists = await Batch.findByPk(batch_id,  { transaction });
    if(!batchExists){
        logger.warn("El lote no existe");
        throw new Error("El lote no existe");
    }
    const newQty = Number(batchExists.available_qty) + Number(qty);
    await batchExists.update({
        available_qty: newQty,
    },{transaction});
    logger.info("Lote restablecido exitosamente")
};


module.exports = {createBatch, PEPS, decreaseBatch, increaseBatch}