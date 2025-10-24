  const { generateAccessToken, generateRefreshToken } = require('../utils/tokens');
  const { OAuth2Client } = require("google-auth-library");
  const bcrypt = require('bcryptjs');
  const { models } = require('../db');  
  
  const logger = require('../utils/logger');  
  const ApiResponse = require('../utils/apiResponse');
  const { users: User, tokens: Token, roles: Role } = models;  
  const config = require('../config/config');  
  const jwt = require('jsonwebtoken');
  const ms = require('ms');
  const skew = 10000;
  const client = new OAuth2Client(config.google.clientId);

//   const login = async (req, res) => {
//     const response = new ApiResponse();
//     const { error } = loginSchema.validate(req.body);
//     if (error) return res.status(400).json(response.errorResponse("Validación fallida", error.details));

//     const { username, password } = req.body;
//     logger.info(`Intento de login: ${username}`);

//     try {
//       const user = await User.findOne({
//         where: { username },
//         include: [{ model: Role, as: 'role', attributes: ['role_name'] }]
//       });

//       if (!user || !user.status)
//         return res.status(404).json(response.errorResponse("Usuario inválido o inactivo"));

//       const isPasswordValid = await bcrypt.compare(password, user.password);
//       if (!isPasswordValid)
//         return res.status(401).json(response.errorResponse("Contraseña inválida"));

//       if (user.mustChangePassword) {
//         const tempToken = jwt.sign(
//           {
//             user_id: user.user_id,
//             mustChange: true,
//             role: user.role?.role_name,
//             username: user.username,
//             isTemp: true
//           },
//           config.tokens.accessSecret,
//           { expiresIn: '2m' }
//         );

//         res.cookie('tempToken', tempToken, {
//         httpOnly: true,
//         secure: config.env === 'production',
//         sameSite: config.env === 'production' ? 'Strict' : 'Lax',
//         maxAge: 5 * 60 * 1000, 
//         path: '/',
//       });
      
//       return res.status(200).json(
//         response.successResponse(
//       { mustChangePassword: true },
//       "Debe cambiar su contraseña temporal"
//     ));
//       }

      
//       const accessToken = generateAccessToken(user);
//       const refreshToken = generateRefreshToken();

//       const expirationDate = new Date(Date.now() + ms(config.tokens.refreshExpiration));

//       await Token.create({
//         refresh_token: refreshToken,
//         expiration: expirationDate,
//         user_id: user.user_id
//       });
//       res.cookie('accessToken', accessToken, {
//       httpOnly: true,
//       secure: config.env === 'production',
//       sameSite: config.env === 'production' ? 'Strict' : 'Lax',
//       maxAge: ms(config.tokens.accessExpiration,),
//         path: '/'
//     });
//       res.cookie('refreshToken', refreshToken, {
//         httpOnly: true,
//         secure: config.env === 'production',
//         sameSite: config.env === 'production' ? 'Strict' : 'Lax',
//         maxAge: ms(config.tokens.refreshExpiration),
//           path: '/'
//       });
//       return res.status(200).json(response.successResponse({
//         user: {
//           user_id: user.user_id,
//           names: user.names,
//           last_names: user.last_names,
//           role: user.role?.role_name
//         }
//       }, "Login exitoso"));
//     } catch (error) {
//       logger.error("Error al hacer login", error);
//       return res.status(500).json(response.errorResponse("Error al hacer login", error));
//     }
// };
  
  const googleLogin = async (req, res) => {
  const response = new ApiResponse();
  const { idToken } = req.body; // En Postman envías { "idToken": "TOKEN_DE_GOOGLE" }

  if (!idToken) {
    return res.status(400).json(response.errorResponse("idToken es requerido"));
  }

  try {
    
    const ticket = await client.verifyIdToken({
      idToken,
      audience: config.google.clientId,
    });

    const payload = ticket.getPayload();
    const { sub: googleId, email, name, picture } = payload;


    let user = await User.findOne({ where: { google_id: googleId } });
    if (!user) {
      user = await User.create({
        google_id: googleId,
        email,
        username: name,
        password: null,
        role_id: 3, 
        status: true,
      });
    }
    const token = generateAccessToken({ userId: user.user_id });

    return res.status(200).json(
      response.successResponse(
        { user, token },
        "Login con Google exitoso"
      )
    );
  } catch (error) {
    console.error(error);
    return res.status(500).json(response.errorResponse("Error en login con Google", error));
  }
};

  const refresh = async (req, res) => {
  const response = new ApiResponse();

  try {
    const { user, tokenRecord } = req;
    const newAccessToken = generateAccessToken(user);
    const newRefreshToken = generateRefreshToken();
    const newExpiration = new Date(Date.now() + ms(config.tokens.refreshExpiration));

    // Fix: Usa el MISMO newRefreshToken para DB y cookie
    tokenRecord.refresh_token = newRefreshToken;
    tokenRecord.expiration = newExpiration;
    await tokenRecord.save();  // Solo una vez, elimina el duplicado

    res.cookie('accessToken', newAccessToken, {
      httpOnly: true,
      secure: config.env === 'production',
      sameSite: config.env === 'production' ? 'Strict' : 'Lax',
      maxAge: ms(config.tokens.accessExpiration),
      path: '/'
    });

    res.cookie('refreshToken', newRefreshToken, {
      httpOnly: true,
      secure: config.env === 'production',
      sameSite: config.env === 'production' ? 'Strict' : 'Lax',
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
  httpOnly: true,
  secure: config.env === 'production',
  sameSite: 'Strict',
    path: '/'
});
res.clearCookie('accessToken', {
  httpOnly: true,
  secure: config.env === 'production',
  sameSite: 'Strict',
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
    logger.info('usuario autenticado');
    return res.status(200).json(response.successResponse({
      user: {
        user_id: userExists.user_id,
        username: userExists.username,
        names: userExists.names,
        last_names: userExists.last_names,
        role_name: userExists.role.role_name
      },
    }, "Usuario autenticado"));
    
  } catch (error) {
    logger.error("Error al obtener usuario", error);
    return res.status(500).json(response.errorResponse("Error al obtener usuario", error));
  }
};

  module.exports = {  refresh, logout, getMe, googleLogin };