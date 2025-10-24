const { models } = require('../db');
const { users: User } = models;
const logger = require('../utils/logger');
const apiResponse = require('../utils/apiResponse');
const ApiResponse = require('../utils/apiResponse');
const { createUser } = require('../schemas/userSchema');

const listUsers = async(req,res) => {
    const apiResponse = new ApiResponse();
    try{
    const users = await User.findAll({
        where: {
            status: 1
        }
    });
    logger.info("Usuarios obtenidos exitosamente");
    return res.status(200).json(apiResponse.successResponse(users, "Usuarios obtenidos exitosamente"));
    }catch(error){
        logger.error("Error al listar los usuarios", error)
        return res.status(500).json(apiResponse.errorResponse("Error al listar los usuarios"));
    }

};





module.exports = { listUsers}