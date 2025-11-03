const nodemailer = require('nodemailer');
const config = require('../config/config');
const logger = require('../utils/logger');

let transporter;

const getTransporter = () => {
    if (transporter) {
        return transporter;
    }

    const mailConfig = config.mail || {};
    const user = mailConfig.user || mailConfig.mailUser;
    const pass = mailConfig.pass || mailConfig.mailPass;
    const service = mailConfig.service;
    const host = mailConfig.host;
    const port = mailConfig.port;
    const secure = mailConfig.secure;

    if (!user || !pass) {
        throw new Error('Mail credentials are not configured');
    }

    let transportOptions;

    if (service) {
        transportOptions = { service };
    } else if (host) {
        transportOptions = {
            host,
            port,
            secure,
        };
    } else {
        transportOptions = { service: 'gmail' };
    }

    transportOptions.auth = {
        user,
        pass,
    };

    transporter = nodemailer.createTransport(transportOptions);

    return transporter;
};

const sendEmail = async ({ to, subject, html, text, attachments = [], from }) => {
    try {
        const mailOptions = {
            from: from || config.mail?.from || config.mail?.user || config.mail?.mailUser,
            to,
            subject,
            html,
            text,
            attachments,
        };

        await getTransporter().sendMail(mailOptions);
        logger.info('Email sent successfully', { to, subject });
    } catch (error) {
        logger.error('Failed to send email', error);
        throw error;
    }
};

const sendQuotationEmail = async ({ to, subject, html, attachments = [] }) => {
    return sendEmail({ to, subject, html, attachments });
};

module.exports = {
    sendEmail,
    sendQuotationEmail,
};
