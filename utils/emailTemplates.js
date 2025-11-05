'use strict';

const config = require('../config/config');

const DEFAULT_LOGO_URL = 'https://dummyimage.com/200x60/0f172a/ffffff&text=413+RACE';
const DEFAULT_HERO_URL = 'https://images.unsplash.com/photo-1503736334956-4c8f8e92946d?auto=format&fit=crop&w=1200&q=80';

const getBrandAsset = (value, fallback) => (typeof value === 'string' && value.trim().length ? value.trim() : fallback);

const getColor = (value, fallback) => {
    if (typeof value !== 'string') {
        return fallback;
    }
    const trimmed = value.trim();
    return trimmed ? trimmed : fallback;
};

const buildButton = ({ label, href, background, color }) => `
    <a
        href="${href}"
        style="
            display:inline-block;
            padding:14px 28px;
            border-radius:999px;
            background:${background};
            color:${color};
            text-decoration:none;
            font-weight:700;
            letter-spacing:0.5px;
            text-transform:uppercase;
        "
    >${label}</a>
`;

const buildInfoRow = ({ label, value }) => `
    <tr>
        <td style="padding:12px 16px;border-bottom:1px solid rgba(255,255,255,0.07);color:#9ca3af;font-size:13px;text-transform:uppercase;letter-spacing:1.2px;">
            ${label}
        </td>
        <td style="padding:12px 16px;border-bottom:1px solid rgba(255,255,255,0.07);color:#f9fafb;font-size:16px;font-weight:600;text-align:right;">
            ${value}
        </td>
    </tr>
`;

const welcomePromoTemplate = ({ customerName, promoCode, discountLabel, endDateLabel, ctaUrl }) => {
    const logoUrl = getBrandAsset(config.mail?.brandLogoUrl, DEFAULT_LOGO_URL);
    const brandHero = getBrandAsset(config.mail?.brandHeroUrl, DEFAULT_HERO_URL);
    const heroUrl = getBrandAsset(config.mail?.welcomeHeroUrl, brandHero);
    const primaryColor = getColor(config.mail?.primaryColor, '#f44336');
    const secondaryColor = getColor(config.mail?.secondaryColor, '#111827');
    const accentColor = primaryColor;
    const rawCta = typeof ctaUrl === 'string' && ctaUrl.trim().length
        ? ctaUrl.trim()
        : (typeof config.mail?.ctaUrl === 'string' && config.mail.ctaUrl.trim().length
            ? config.mail.ctaUrl.trim()
            : '');
    const resolvedCtaUrl = rawCta || null;

    const heroSection = heroUrl
        ? `<td style="padding:0;">
                <img src="${heroUrl}"
                    alt="Supercar accelerando"
                    width="600"
                    style="width:100%;max-width:600px;height:auto;border-radius:20px 20px 0 0;display:block;" />
            </td>`
        : '';

    const cta = resolvedCtaUrl
        ? buildButton({
            label: 'Usa tu código',
            href: resolvedCtaUrl,
            background: accentColor,
            color: '#ffffff'
        })
        : '';

    return `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Bienvenido a 413 RACE</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700&display=swap');
    </style>
</head>
<body style="margin:0;padding:0;background:#0b0f19;font-family:'Montserrat',Arial,sans-serif;color:#f9fafb;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#0b0f19;padding:32px 0;">
        <tr>
            <td align="center" style="padding:0 24px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:600px;background:#111827;border-radius:20px;overflow:hidden;box-shadow:0 20px 45px rgba(15,23,42,0.6);">
                    <tr>
                        <td style="padding:24px 24px 12px;" align="center">
                            <img src="${logoUrl}" alt="Logo 413 RACE" width="200" style="width:200px;max-width:80%;height:auto;display:block;" />
                        </td>
                    </tr>
                    ${heroSection}
                    <tr>
                        <td style="padding:32px 28px 24px;">
                            <h1 style="margin:0 0 16px;font-size:28px;font-weight:700;color:#f3f4f6;">¡Bienvenido a la pista, ${customerName}!</h1>
                            <p style="margin:0 0 16px;line-height:1.6;color:#e5e7eb;font-size:16px;">
                                Nos alegra que formes parte de <strong style="color:${accentColor};">413 RACE</strong>. Para celebrar tu llegada, afinamos un obsequio exclusivo para que arranques a toda velocidad.
                            </p>
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="width:100%;margin:24px 0;border-collapse:separate;border-spacing:0;">
                                <tr>
                                    <td style="background:${secondaryColor};border-radius:16px;padding:24px;border:1px solid rgba(255,255,255,0.06);">
                                        <p style="margin:0 0 8px;color:#9ca3af;font-size:14px;text-transform:uppercase;letter-spacing:2px;">Tu código especial</p>
                                        <p style="margin:0 0 16px;font-size:32px;font-weight:700;color:${accentColor};letter-spacing:3px;">${promoCode}</p>
                                        <p style="margin:0 0 8px;color:#e5e7eb;font-size:16px;">Beneficio: <strong>${discountLabel}</strong></p>
                                        <p style="margin:0;color:#9ca3af;font-size:14px;">Vigencia: ${endDateLabel}</p>
                                    </td>
                                </tr>
                            </table>
                            <p style="margin:0 0 16px;color:#e5e7eb;font-size:16px;line-height:1.6;">
                                Ingresa el código al finalizar tu próxima compra y deja que el descuento te dé ese impulso extra.
                            </p>
                            <div style="text-align:center;margin:32px 0;">
                                ${cta}
                            </div>
                            <p style="margin:0;color:#6b7280;font-size:13px;line-height:1.6;text-align:center;">
                                ¿Necesitas ayuda? Nuestro equipo está listo para asistirte en cada curva.
                            </p>
                        </td>
                    </tr>
                    <tr>
                        <td style="background:#0f172a;padding:20px 28px;border-top:1px solid rgba(255,255,255,0.05);text-align:center;">
                            <p style="margin:0;color:#4b5563;font-size:12px;">© ${new Date().getFullYear()} 413 RACE · Pasión por los motores</p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>`;
};

const quotationTemplate = ({
    customerName,
    quotationNumber,
    carName,
    totalDisplay,
    statusLabel,
    createdAtLabel,
    ctaUrl,
}) => {
    const logoUrl = getBrandAsset(config.mail?.brandLogoUrl, DEFAULT_LOGO_URL);
    const brandHero = getBrandAsset(config.mail?.brandHeroUrl, DEFAULT_HERO_URL);
    const quotationHero = getBrandAsset(config.mail?.quotationHeroUrl, brandHero);
    const heroUrl = quotationHero;
    const primaryColor = getColor(config.mail?.primaryColor, '#f44336');
    const secondaryColor = getColor(config.mail?.secondaryColor, '#111827');
    const accentColor = primaryColor;
    const rawCta = typeof ctaUrl === 'string' && ctaUrl.trim().length
        ? ctaUrl.trim()
        : (typeof config.mail?.ctaUrl === 'string' && config.mail.ctaUrl.trim().length
            ? config.mail.ctaUrl.trim()
            : '');
    const resolvedCtaUrl = rawCta || null;

    const heroSection = heroUrl
        ? `<td style="padding:0;">
                <img src="${heroUrl}"
                    alt="${carName || 'Cotización 413 RACE'}"
                    width="600"
                    style="width:100%;max-width:600px;height:auto;border-radius:20px 20px 0 0;display:block;" />
            </td>`
        : '';

    const detailRows = [
        buildInfoRow({ label: 'Número de cotización', value: `#${quotationNumber}` }),
        buildInfoRow({ label: 'Vehículo', value: carName }),
        buildInfoRow({ label: 'Total estimado', value: totalDisplay }),
        buildInfoRow({ label: 'Estado', value: statusLabel }),
        buildInfoRow({ label: 'Fecha de creación', value: createdAtLabel }),
    ].join('');

    const cta = resolvedCtaUrl
        ? buildButton({
            label: 'Ver mi cotización',
            href: resolvedCtaUrl,
            background: accentColor,
            color: '#ffffff'
        })
        : '';

    return `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Cotización ${quotationNumber}</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700&display=swap');
    </style>
</head>
<body style="margin:0;padding:0;background:#0b0f19;font-family:'Montserrat',Arial,sans-serif;color:#f9fafb;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#0b0f19;padding:32px 0;">
        <tr>
            <td align="center" style="padding:0 24px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:600px;background:#111827;border-radius:20px;overflow:hidden;box-shadow:0 20px 45px rgba(15,23,42,0.6);">
                    <tr>
                        <td style="padding:24px 24px 12px;" align="center">
                            <img src="${logoUrl}" alt="Logo 413 RACE" width="200" style="width:200px;max-width:80%;height:auto;display:block;" />
                        </td>
                    </tr>
                    ${heroSection}
                    <tr>
                        <td style="padding:32px 28px 24px;">
                            <h1 style="margin:0 0 16px;font-size:26px;font-weight:700;color:#f3f4f6;">Tu cotización está lista, ${customerName}</h1>
                            <p style="margin:0 0 20px;color:#e5e7eb;line-height:1.6;font-size:16px;">
                                Tenemos los detalles del vehículo que te interesa. Revisa tu cotización y prepárate para sentir la adrenalina al volante.
                            </p>
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="width:100%;border-collapse:separate;border-spacing:0;background:${secondaryColor};border-radius:16px;overflow:hidden;border:1px solid rgba(255,255,255,0.07);">
                                ${detailRows}
                            </table>
                            <div style="text-align:center;margin:32px 0;">
                                ${cta}
                            </div>
                            <p style="margin:0;color:#6b7280;font-size:13px;line-height:1.6;text-align:center;">
                                Un asesor de 413 RACE se pondrá en contacto contigo muy pronto para afinar los últimos detalles.
                            </p>
                        </td>
                    </tr>
                    <tr>
                        <td style="background:#0f172a;padding:20px 28px;border-top:1px solid rgba(255,255,255,0.05);text-align:center;">
                            <p style="margin:0;color:#4b5563;font-size:12px;">© ${new Date().getFullYear()} 413 RACE · Pasión por los motores</p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>`;
};

module.exports = {
    welcomePromoTemplate,
    quotationTemplate,
};
