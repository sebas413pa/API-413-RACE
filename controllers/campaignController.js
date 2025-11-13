'use strict';

const { models, sequelize } = require('../db');
const logger = require('../utils/logger');
const ApiResponse = require('../utils/apiResponse');
const { campaignTemplate } = require('../utils/emailTemplates');
const { sendEmail } = require('../services/emailService');

const { promo_codes: PromoCode, customers: Customer } = models;

const generateCode = (len = 8) => {
    const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
    let out = '';
    for (let i = 0; i < len; i++) {
        out += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return out;
};

const replacePlaceholders = (text, client, promoCode = '') => {
    if (typeof text !== 'string') return text;
    const name = [client.first_name, client.last_name].filter(Boolean).join(' ').trim() || client.email || '';
    return text
        .replace(/{{\s*client\s*}}/gi, name)
        .replace(/{{\s*promo_code\s*}}/gi, promoCode || '')
        .replace(/{{\s*code\s*}}/gi, promoCode || '');
};

const processCampaign = async (req, res) => {
    const response = new ApiResponse();

    const body = req.body && typeof req.body === 'object' ? req.body : null;
    if (!body) {
        return res.status(400).json(response.errorResponse('Payload inválido'));
    }

    const campaign = body.data || body;
    if (!campaign) {
        return res.status(400).json(response.errorResponse('No se encontró data de la campaña'));
    }

    const clients = Array.isArray(campaign.clients) ? campaign.clients : [];
    const imageUrl = campaign.image_url || campaign.image || null;
    const percentage = campaign.percentage_amount ?? null;
    const startDate = campaign.start_date ? new Date(campaign.start_date) : new Date();
    const endDate = campaign.end_date ? new Date(campaign.end_date) : null;

    const results = { sent: 0, errors: [], codesCreated: 0 };

    if (!clients.length) {
        logger.info('Campaña recibida sin clientes listados', { campaign_id: campaign.campaign_id });
        return res.status(200).json(response.successResponse({ message: 'No clients to process' }));
    }

    const transaction = await sequelize.transaction();
    try {
        let apiClient = null;
        try {
            apiClient = (await import('../utils/apiClient.js')).default;
        } catch (impErr) {
            await transaction.rollback();
            logger.error('No se pudo importar apiClient para sincronizar promo codes', impErr);
            return res.status(500).json(response.errorResponse('Error de integración con servicio externo', impErr.message || impErr));
        }

        for (const client of clients) {
            try {
                let localCustomer = null;
                if (client.client_id) {
                    localCustomer = await Customer.findByPk(client.client_id, { transaction });
                }
                if (!localCustomer && client.email) {
                    localCustomer = await Customer.findOne({ where: { email: client.email }, transaction });
                }

                let promoCode = null;
                if (percentage !== null && typeof percentage !== 'undefined') {
                    const code = generateCode(8);
                    const payload = {
                        promo_code: code,
                        customer_id: localCustomer ? localCustomer.customer_id : null,
                        discount_type: 'percentage',
                        discount_value: Number(percentage),
                        min_purchase_amount: 0,
                        max_discount_amount: null,
                        start_date: startDate,
                        end_date: endDate,
                        status: true,
                    };

                    const created = await PromoCode.create(payload, { transaction });
                    promoCode = created.promo_code;
                    results.codesCreated++;

                    try {
                        const remotePayload = {
                            code_id: created.promo_code_id,
                            percentage: Number(percentage),
                            promo_code: created.promo_code,
                            start_date: startDate,
                            end_date: endDate,
                            client_id: localCustomer ? localCustomer.customer_id : (client.client_id || null),
                        };
                        console.log(remotePayload)
                        const remoteResp = await apiClient.post('/promo-codes', remotePayload);
                        if (!(remoteResp && remoteResp.status >= 200 && remoteResp.status < 300) || (remoteResp.data && remoteResp.data.success === false)) {
                            const err = new Error('Respuesta no exitosa del servicio externo al crear promo code');
                            err.response = remoteResp;
                            err.isExternal = true;
                            throw err;
                        }
                    } catch (apiErr) {
                        apiErr.isExternal = true;
                        throw apiErr;
                    }
                }

                const rawSubject = campaign.template?.subject || campaign.campaign_name || campaign.campaign_title || 'Novedades desde 413 RACE';
                const rawBody = campaign.template?.body_text || campaign.description || campaign.message || campaign.body || '';

                const discountLabel = percentage !== null ? `${Number(percentage)}%` : '';
                const endDateLabel = endDate ? endDate.toLocaleDateString('es-ES') : 'Sin fecha de caducidad';

                const subjectWithPlaceholders = replacePlaceholders(rawSubject, client, promoCode);
                const bodyWithPlaceholders = replacePlaceholders(rawBody, client, promoCode);

                const html = campaignTemplate({
                    customerName: [client.first_name, client.last_name].filter(Boolean).join(' ').trim() || client.email || 'Cliente',
                    subjectTitle: subjectWithPlaceholders,
                    bodyHtml: bodyWithPlaceholders,
                    promoCode,
                    discountLabel,
                    endDateLabel,
                    heroImageUrl: imageUrl,
                    ctaUrl: campaign.cta_url || campaign.cta || null,
                });

                const subject = subjectWithPlaceholders;

                if (client.email) {
                    await sendEmail({ to: client.email, subject, html });
                    results.sent++;
                } else {
                    results.errors.push({ client, error: 'No email provided' });
                }
            } catch (innerErr) {
                if (innerErr && innerErr.isExternal) {
                    throw innerErr;
                }
                logger.error('Error procesando cliente de campaña', { client: client, err: innerErr });
                results.errors.push({ client, error: innerErr.message || String(innerErr) });
            }
        }

        await transaction.commit();
        return res.status(200).json(response.successResponse(results, 'Campaña procesada'));
    } catch (err) {
        try { if (!transaction.finished) await transaction.rollback(); } catch (rbErr) { logger.error('Rollback failed', rbErr); }
        logger.error('Error procesando campaña', err);
        return res.status(500).json(response.errorResponse('Error procesando campaña', err));
    }
};

module.exports = {
    processCampaign,
};
