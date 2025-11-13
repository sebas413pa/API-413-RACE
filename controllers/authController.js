  const { generateAccessToken, generateRefreshToken } = require('../utils/tokens');
  const bcrypt = require('bcryptjs');
  const { models } = require('../db');  
  const logger = require('../utils/logger');  
  const ApiResponse = require('../utils/apiResponse');
  const { loginUser } = require('../schemas/authSchema');
  const { users: User, tokens: Token, roles: Role, customers: Customer, cities: City} = models;  
  const config = require('../config/config');  
  const jwt = require('jsonwebtoken');
  const ms = require('ms');
const { custom } = require('joi');
  


  const login = async (req, res) => {
    const response = new ApiResponse();
    const { error, value } = loginUser.validate(req.body);
    if (error)
      return res.status(400).json(response.errorResponse("Validación fallida", error.details));

    const { username, password } = value;
    logger.info(`Intento de login: ${username}`);

    try {
      const user = await User.findOne({
        where: { username },
        include: [{ model: Role, as: 'role', attributes: ['role_name'] }]
      });

      if (!user || !user.status)
        return res.status(404).json(response.errorResponse("Usuario inválido o inactivo"));

      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid)
        return res.status(401).json(response.errorResponse("Contraseña inválida"));

      if (user.mustChangePassword) {
        const tempToken = jwt.sign(
          {
            user_id: user.user_id,
            mustChange: true,
            role: user.role?.role_name,
            username: user.username,
            isTemp: true
          },
          config.tokens.accessSecret,
          { expiresIn: '5m' }
        );

        res.cookie('tempToken', tempToken, {
        httpOnly: false,
        secure: config.env === 'production',
        sameSite: config.env === 'production' ? 'None' : 'lax',
        ...(config.env === 'production' && { domain: '.413-race.store' }),
        maxAge: 5 * 60 * 1000, 
        path: '/',
      });
      
      return res.status(200).json(
        response.successResponse(
      { mustChangePassword: true },
      "Debe cambiar su contraseña temporal"
    ));
      }

      
      const accessToken = generateAccessToken(user);
      const refreshToken = generateRefreshToken();

      const expirationDate = new Date(Date.now() + ms(config.tokens.refreshExpiration));

      await Token.create({
        refresh_token: refreshToken,
        expiration: expirationDate,
        user_id: user.user_id
      });
      res.cookie('accessToken', accessToken, {
      httpOnly: false,
      secure: config.env === 'production',
      sameSite: config.env === 'production' ? 'None' : 'lax',
        ...(config.env === 'production' && { domain: '.413-race.store' }),
      maxAge: ms(config.tokens.accessExpiration,),
        path: '/'
    });
      res.cookie('refreshToken', refreshToken, {
        httpOnly: false,
        secure: config.env === 'production',
        sameSite: config.env === 'production' ? 'None' : 'lax',
        ...(config.env === 'production' && { domain: '.413-race.store' }),
        maxAge: ms(config.tokens.refreshExpiration),
          path: '/'
      });
      return res.status(200).json(response.successResponse({
        user: {
          user_id: user.user_id,
          names: user.names,
          last_names: user.last_names,
          role: user.role?.role_name
        }
      }, "Login exitoso"));
    } catch (error) {
      logger.error("Error al hacer login", error);
      return res.status(500).json(response.errorResponse("Error al hacer login", error));
    }
};


  const refresh = async (req, res) => {
  const response = new ApiResponse();

  try {
    const { user, tokenRecord } = req;
    const newAccessToken = generateAccessToken(user);
    const newRefreshToken = generateRefreshToken();
    const newExpiration = new Date(Date.now() + ms(config.tokens.refreshExpiration));


    tokenRecord.refresh_token = newRefreshToken;
    tokenRecord.expiration = newExpiration;
    await tokenRecord.save(); 

    res.cookie('accessToken', newAccessToken, {
      httpOnly: false,
      secure: config.env === 'production',
        sameSite: config.env === 'production' ? 'None' : 'lax',
        ...(config.env === 'production' && { domain: '.413-race.store' }),
      maxAge: ms(config.tokens.accessExpiration),
      path: '/'
    });

    res.cookie('refreshToken', newRefreshToken, {
      httpOnly: false,
      secure: config.env === 'production',
        sameSite: config.env === 'production' ? 'None' : 'lax',
        ...(config.env === 'production' && { domain: '.413-race.store' }),
      maxAge: ms(config.tokens.refreshExpiration),
        path: '/'
    });
    logger.info('Refresh exitoso');
    return res.status(200).json(
  response.successResponse(
    "Refresh exitoso"
  )
);
  } catch (error) {
    logger.error("Error al hacer refresh", error);
    return res.status(500).json(response.errorResponse("Error al hacer refresh", error));
  }
};

  const logout = async (req, res) => {
  const response = new ApiResponse();
  try {
    const tokenRecord = req.tokenRecord;
    
    if (tokenRecord) {
      await tokenRecord.destroy();
    }
    res.clearCookie('refreshToken', {
  httpOnly: false,
  secure: config.env === 'production',
  sameSite: config.env === 'production' ? 'None' : 'lax',
  ...(config.env === 'production' && { domain: '.413-race.store' }),
    path: '/'
});
  res.clearCookie('accessToken', {
  httpOnly: false,
  secure: config.env === 'production',
          sameSite: config.env === 'production' ? 'None' : 'lax',
        ...(config.env === 'production' && { domain: '.413-race.store' }),
    path: '/'
});
    logger.info("Logout exitoso");
    return res.status(200).json(response.successResponse(null, "Logout exitoso")); 
  } catch (error) {
    logger.error("Error al hacer logout", error);
    return res.status(500).json(response.errorResponse("Error al hacer logout", error));
  }
};

  const getMe = async (req, res) => {
  const response = new ApiResponse();

  try {
    const user = req.user;
    const userExists = await User.findByPk(user.user_id,{
      include: [{model: Role, as: 'role', attributes:['role_name']}]
    });
    if (!userExists) {
      return res.status(401).json(response.errorResponse("Usuario no autenticado"));
    }
    let customerExists = null;
    if(userExists.role.role_name === 'Cliente'){
        customerExists = await Customer.findOne({
        where:{
          user_id: userExists.user_id
        },
        include: [
      {
        model: City,
        as: "city",
        attributes: ["city_id", "city_name"]
      }
    ]
      });
    }
    logger.info('Usuario autenticado');
    return res.status(200).json(response.successResponse({
      user: {
        user_id: userExists.user_id,
        username: userExists.username,
        role_name: userExists.role.role_name,
        email: userExists.email,
      },
       customer: customerExists
            ? {
                customer_id: customerExists.customer_id,
                first_name: customerExists.first_name,
                last_name: customerExists.last_name,
                birtdhay: customerExists.birthday,
                gender: customerExists.gender,
                phone: customerExists.phone,
                address: customerExists.address,
                city: customerExists.city
                  ? {
                      city_id: customerExists.city.city_id,
                      city_name: customerExists.city.city_name
                    }
                  : null
              }
            : null,
    }, "Usuario autenticado"));
    
  } catch (error) {
    logger.error("Error al obtener usuario", error);
    return res.status(500).json(response.errorResponse("Error al obtener usuario", error));
  }
};

  module.exports = {  login, refresh, logout, getMe };