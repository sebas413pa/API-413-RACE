const sgMail = require('@sendgrid/mail');
const config = require('../config/config');
const logger = require('../utils/logger');

// Configurar SendGrid API Key
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

/**
 * Envía un correo electrónico usando SendGrid.
 * Mantiene la misma firma y comportamiento que antes con Nodemailer.
 */
const sendEmail = async ({ to, subject, html, text, attachments = [], from }) => {
  try {
    const sender = from || config.mail?.from || process.env.SENDGRID_FROM_EMAIL;

    const msg = {
      to,
      from: sender,
      subject,
      html,
      text,
      trackingSettings: {
    clickTracking: { enable: false },
    openTracking: { enable: false },
  }
    };

    // Si hay adjuntos, los convertimos al formato SendGrid
    if (attachments.length > 0) {
      msg.attachments = attachments.map(att => ({
        content: att.content
          ? (Buffer.isBuffer(att.content)
              ? att.content.toString('base64')
              : Buffer.from(att.content).toString('base64'))
          : '',
        filename: att.filename || 'attachment',
        type: att.contentType || 'application/octet-stream',
        disposition: 'attachment',
      }));
    }

    await sgMail.send(msg);
    logger.info('Email sent successfully via SendGrid', { to, subject });
  } catch (error) {
    logger.error('Failed to send email via SendGrid', error);
    throw error;
  }
};

/**
 * Envío de cotización (usa la misma lógica de sendEmail)
 */
const sendQuotationEmail = async ({ to, subject, html, attachments = [] }) => {
  return sendEmail({ to, subject, html, attachments });
};

module.exports = {
  sendEmail,
  sendQuotationEmail,
};