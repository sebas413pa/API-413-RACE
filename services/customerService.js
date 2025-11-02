const WELCOME_PROMO_PREFIX = 'CLIENTE-NUEVO';
const WELCOME_PROMO_DISCOUNT = 15;
const WELCOME_PROMO_VALIDITY_DAYS = 30;
const bcrypt = require('bcryptjs');
const logger = require('../utils/logger');
const crypto = require('crypto');
const { sequelize, models } = require('../db');
const { customers: Customer, users: User, roles: Role, promo_codes: PromoCode, cities:City } = models;

const createWelcomePromoCode = async (customerId, transaction) => {
  const now = new Date();
  const endDate = new Date(now.getTime() + WELCOME_PROMO_VALIDITY_DAYS * 24 * 60 * 60 * 1000);
  const maxAttempts = 5;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const suffix = crypto.randomBytes(3).toString('hex').toUpperCase();
    const code = `${WELCOME_PROMO_PREFIX}-${suffix}`;

    try {
      const promo = await PromoCode.create({
        promo_code: code,
        customer_id: customerId,
        discount_type: 'percentage',
        discount_value: WELCOME_PROMO_DISCOUNT,
        min_purchase_amount: 0,
        max_discount_amount: null,
        start_date: now,
        end_date: endDate,
        status: true,
      }, { transaction });

      logger.info('Código promocional de bienvenida generado', { promo_code: code, customer_id: customerId });
      return promo;
    } catch (err) {
      if (err.name === 'SequelizeUniqueConstraintError' && attempt < maxAttempts - 1) {
        logger.warn('Colisión de código promocional, reintentando', { code, attempt });
        continue;
      }
      throw err;
    }
  }

  throw new Error('UNABLE_TO_GENERATE_WELCOME_PROMO_CODE');
};

module.exports = {createWelcomePromoCode}