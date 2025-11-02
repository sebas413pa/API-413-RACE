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

  const sale_price = Number((new_price / (1 - carExists.profit_margin / 100)).toFixed(2));

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


const normalizeNumber = (v) => (v === undefined || v === null || v === "" ? undefined : Number(v));
const normalizeBoolean = (v) => {
  if (v === undefined || v === null || v === "") return undefined;
  if (typeof v === "boolean") return v;
  return v === "true" || v === "1" || v === 1 || v === "on";
};
const normalizeString = (v) => (v === undefined || v === null || v === "" ? undefined : String(v));
const toPriceNumber = (value) => {
  if (value === undefined || value === null || value === "") return null;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? null : parsed;
};
const computePromotionPrice = (basePrice, promotion) => {
  if (basePrice === null || basePrice === undefined) return null;
  if (typeof basePrice !== "number" || Number.isNaN(basePrice)) return null;
  if (!promotion) return null;
  const discountValue = toPriceNumber(promotion.discount_value);
  if (discountValue === null) return null;

  let finalPrice = basePrice;
  if (promotion.discount_type === "percentage") {
    finalPrice = basePrice * (1 - discountValue / 100);
  } else if (promotion.discount_type === "fixed_amount") {
    finalPrice = basePrice - discountValue;
  }

  if (!Number.isFinite(finalPrice)) return null;
  if (finalPrice < 0) finalPrice = 0;
  return Number(finalPrice.toFixed(2));
};
const selectBestPromotion = (basePrice, promotionProducts) => {
  if (basePrice === null || basePrice === undefined) return null;
  if (!Array.isArray(promotionProducts) || !promotionProducts.length) return null;
  let best = null;
  let bestPrice = basePrice;

  for (const relation of promotionProducts) {
    if (!relation || !relation.promotion) continue;
    const promoPrice = computePromotionPrice(basePrice, relation.promotion);
    if (promoPrice === null) continue;
    if (best === null || promoPrice < bestPrice) {
      best = { promotion: relation.promotion, price: promoPrice };
      bestPrice = promoPrice;
    }
  }

  return best;
};

const buildCarName = (lineInstance, modelValue) => {
  if (!lineInstance) return null;
  const brandName = lineInstance.brand ? lineInstance.brand.brand_name : undefined;
  const lineName = lineInstance.line_name;
  const modelPart = modelValue !== undefined && modelValue !== null ? String(modelValue) : undefined;
  const parts = [brandName, lineName, modelPart]
    .map((part) => (part === undefined || part === null ? null : String(part).trim()))
    .filter((part) => part && part.length);
  if (!parts.length) return null;
  return parts.join(" ").replace(/\s+/g, " ").trim();
};


module.exports = {updateCarPrice, normalizeNumber, buildCarName, selectBestPromotion, computePromotionPrice, toPriceNumber, normalizeBoolean, normalizeString}