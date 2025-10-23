'use strict';
require('dotenv').config();
const { createLogger, format, transports } = require('winston');
const { combine, timestamp, printf, errors } = format;
const logLevel = process.env.LOG_LEVEL || 'info';

const levelColor = (level) => {
  switch(level) {
    case 'error': return `\x1b[31m${level.toUpperCase()}\x1b[0m`; // rojo
    case 'warn':  return `\x1b[33m${level.toUpperCase()}\x1b[0m`; // amarillo
    case 'info':  return `\x1b[32m${level.toUpperCase()}\x1b[0m`; // verde
    case 'debug': return `\x1b[36m${level.toUpperCase()}\x1b[0m`; // cian
    default:      return level.toUpperCase();
  }
};

const messageColor = (level, message) => {
  switch(level) {
    case 'error': return `\x1b[31m${message}\x1b[0m`; // rojo
    case 'warn':  return `\x1b[33m${message}\x1b[0m`; // amarillo
    case 'info':  return `\x1b[32m${message}\x1b[0m`; // verde
    case 'debug': return `\x1b[36m${message}\x1b[0m`; // cian
    default:      return message;
  }
};

const consoleFormat = printf(({ level, message, stack, timestamp }) => {
  const coloredTime = `\x1b[95m${timestamp}\x1b[0m`; // magenta vivo para la hora
  const coloredLevel = levelColor(level);
  const coloredMessage = stack ? messageColor(level, message) : messageColor(level, message);

  return stack
    ? `[${coloredTime}] ${coloredLevel}: ${coloredMessage}\nSTACK TRACE:\n${stack}`
    : `[${coloredTime}] ${coloredLevel}: ${coloredMessage}`;
});

const logger = createLogger({
  level: logLevel,
  format: combine(
    errors({ stack: true }),
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' })
  ),
  transports: [
    new transports.Console({
      format: consoleFormat
    })
  ],
  exitOnError: false
});

module.exports = logger;