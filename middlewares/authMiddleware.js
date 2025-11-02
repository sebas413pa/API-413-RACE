const jwt = require('jsonwebtoken');
const config = require('../config/config');
const logger = require('../utils/logger');
const ApiResponse = require('../utils/apiResponse');

const authenticateJWT = (req, res, next) => {
  const response = new ApiResponse();
  const token = req.cookies?.accessToken;

  if (!token) {
    logger.warn("No autorizado: Token requerido");
    return res.status(401).json(response.errorResponse('ACCESS_TOKEN_REQUIRED'));
  }

  jwt.verify(token, config.tokens.accessSecret, (error, user) => {
    if (error) {
      logger.warn("Token inválido o expirado");
      return res.status(401).json(response.errorResponse('ACCESS_TOKEN_EXPIRED'));
    }

    if (user.isTemp) {
      logger.warn("Intento de usar token temporal en ruta protegida");
      return res.status(403).json(response.errorResponse('Token temporal no permitido para esta ruta'));
    }

    req.user = user;
    logger.info("Token válido", req.user);
    next();
  });
};

const optionalAuthenticateJWT = (req, res, next) => {
  const token = req.cookies?.accessToken;

  if (!token) {
    return next();
  }

  jwt.verify(token, config.tokens.accessSecret, (error, user) => {
    if (error) {
      logger.warn("Token inválido o expirado en acceso opcional");
      return next();
    }

    if (user.isTemp) {
      const response = new ApiResponse();
      logger.warn("Intento de usar token temporal en ruta opcional");
      return res.status(403).json(response.errorResponse('Token temporal no permitido para esta ruta'));
    }

    req.user = user;
    logger.info("Token opcional válido", req.user);
    next();
  });
};

module.exports = { authenticateJWT, optionalAuthenticateJWT };