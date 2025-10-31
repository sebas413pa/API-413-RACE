const { log } = require('../config/config');
const { models } = require('../db');
const purchase_details = require('../models/purchase_details');
const logger = require('../utils/logger');
const Car = models.cars

async function updateCarPrice(car_id, new_price, transaction) {
    
    try
    {
        const carExists = await Car.findByPk(car_id, {transaction});
        if(!carExists) {
            logger.warn("El carro no existe")
            throw new Error("El carro no existe")
        }

        const sale_price = new_price * 0.1 + new_price

        await carExists.update({
            purchase_price: new_price,
            sale_price
        }, {transaction})

        return true;
    }
    catch(error)
    {
        logger.error("Error al actuallizar el precio", error)
        throw error
    }
}

module.exports = {updateCarPrice}