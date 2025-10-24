const ApiResponse = require('../utils/apiResponse');
const logger = require('../utils/logger');

const checkRole = (allowedRoles = []) => {
    return (req, res, next) => {
        const response = new ApiResponse();

        if (!req.user) {
            logger.warn("Usuario no autenticado intentando acceder a ruta protegida");
            return res.status(401).json(response.errorResponse("Usuario no autenticado"));
        }
        if (!allowedRoles.includes(req.user.role)) {
            logger.warn(`Acceso denegado para usuario: ${req.user.username} con rol: ${req.user.role}`);
            return res.status(403).json(response.errorResponse("Acceso denegado"));
        }

        next();
    };
};

module.exports = { checkRole };