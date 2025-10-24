const { models } = require('../db');
const { tokens: Token, users: User, roles: Role } = models;
const ApiResponse = require('../utils/apiResponse');
const  logger = require('../utils/logger');
const authenticateRefresh = async (req, res, next) => {
    const response = new ApiResponse();
    try{
        const refreshToken = req.cookies?.refreshToken;
    if(!refreshToken){
        logger.warn('Refresh token requerido');
        return res.status(401).json(response.errorResponse('Refresh token requerido'));
    }
    const tokenRecord = await Token.findOne({where:{refresh_token: refreshToken}});
    if(!tokenRecord || new Date() > tokenRecord.expiration)
    {
        logger.warn('Refresh token invalido o expirado');
        return res.status(403).json(response.errorResponse('Refresh token invalido o expirado'));
    }
    const user = await User.findByPk(tokenRecord.user_id,{
        include: [{model: Role, as: 'role', attributes: ['role_name']}]
    });
    if(!user || !user.status){
        logger.warn('Usuario invalido o inactivo');
        return res.status(404).json(response.errorResponse('Usuario invalido o inactivo'));
    }
    req.user = user;
    req.tokenRecord =tokenRecord;
    
    next();
    }catch(error){
        logger.error('Error al realizar el refresh', error);
        res.status(500).json(response.errorResponse('Error al realizar el refresh', error));
    }

};
module.exports = { authenticateRefresh }