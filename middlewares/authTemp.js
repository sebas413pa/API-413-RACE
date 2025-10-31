

const jwt = require('jsonwebtoken');
const ApiResponse = require('../utils/apiResponse');
const logger = require('../utils/logger');
const config = require('../config/config');  

const authenticateTempChange = (req, res, next) => {
  const response = new ApiResponse();
  const token = req.cookies?.tempToken;

   if (!token) {
    logger.warn('Token temporal no proporcionado');
    return res.status(401).json(response.errorResponse("Token temporal no proporcionado"));
  }

  try {
    const decoded = jwt.verify(token, config.tokens.accessSecret);

    if (!decoded.isTemp) {
      logger.warn("Intento de usar token normal en ruta temporal");
      return res.status(403).json(response.errorResponse("Token no válido para cambio de contraseña temporal"));
    }

    req.user = decoded; 
    next();
  } catch (err) {
    logger.error("Error verificando token temporal", err);
    return res.status(401).json(response.errorResponse("Token temporal inválido o expirado", err));
  }
};

module.exports = {authenticateTempChange};