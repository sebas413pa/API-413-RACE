const { models } = require('../db');
const logger = require('../utils/logger');
const { Op } = require('sequelize');
const Product = models.products;
const PromotionProduct = models.promotion_products;
const Promotion = models.promotions;

async function updateProductPrice(product_id, new_price, transaction) {
    
    try
    {
        const productExists = await Product.findByPk(product_id, {transaction});
        if(!productExists) {
            logger.warn("El carro no existe")
            throw new Error("El carro no existe")
        }

        const sale_price = new_price * productExists.profit_margin + new_price

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

const toNumber = (value) => {
    if (value === undefined || value === null) return null;
    const num = Number(value);
    return Number.isNaN(num) ? null : num;
};

const applyPromotionToPrice = (basePrice, promotion) => {
    if (basePrice === null || basePrice === undefined) return null;
    if (!promotion) return null;
    const discount = toNumber(promotion.discount_value);
    if (discount === null) return null;

    let price = basePrice;
    if (promotion.discount_type === 'percentage') {
        price = basePrice * (1 - discount / 100);
    } else if (promotion.discount_type === 'fixed_amount') {
        price = basePrice - discount;
    }

    if (!Number.isFinite(price)) return null;
    if (price < 0) price = 0;
    return Number(price.toFixed(2));
};

async function getProductEffectivePrice(product_id, transaction) {
    const product = await Product.findByPk(product_id, { transaction });
    if (!product) {
        logger.warn('Producto no encontrado', { product_id });
        throw new Error('Producto no encontrado');
    }

    const basePrice = toNumber(product.sale_price);
    if (basePrice === null) {
        logger.warn('Producto sin precio de venta válido', { product_id, sale_price: product.sale_price });
        return { product, price: null, promotion: null };
    }

    const now = new Date();
    const promotionEntries = await PromotionProduct.findAll({
        where: {
            product_id,
            status: true,
        },
        include: [
            {
                model: Promotion,
                as: 'promotion',
                required: true,
                where: {
                    status: true,
                    start_date: { [Op.lte]: now },
                    [Op.or]: [
                        { end_date: { [Op.gte]: now } },
                        { end_date: null },
                    ],
                },
            },
        ],
        transaction,
    });

    let bestPrice = basePrice;
    let bestPromotion = null;

    for (const entry of promotionEntries) {
        if (!entry || !entry.promotion) continue;
        const promoPrice = applyPromotionToPrice(basePrice, entry.promotion);
        if (promoPrice === null) continue;
        if (bestPromotion === null || promoPrice < bestPrice) {
            bestPrice = promoPrice;
            bestPromotion = entry.promotion;
        }
    }

    return {
        product,
        price: bestPrice,
        promotion: bestPromotion,
    };
}

module.exports = {updateProductPrice, getProductEffectivePrice}