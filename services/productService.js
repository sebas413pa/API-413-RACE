const { log } = require('../config/config');
const { models } = require('../db');
const purchase_details = require('../models/purchase_details');
const logger = require('../utils/logger');
const Product = models.products

async function updateProductPrice(product_id, new_price, transaction) {
    
    try
    {
        const productExists = await Product.findByPk(product_id, {transaction});
        if(!productExists) {
            logger.warn("El carro no existe")
            throw new Error("El carro no existe")
        }

        const sale_price = new_price * 0.40 + new_price

        await productExists.update({
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

module.exports = {updateProductPrice}