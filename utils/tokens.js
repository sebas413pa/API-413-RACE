const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const config = require('../config/config');

const generateAccessToken = (user) => {
    return jwt.sign(
        {
            user_id: user.user_id, 
            role: user.role ? user.role.role_name : null,
        },
        config.tokens.accessSecret,
        {
            expiresIn: config.tokens.accessExpiration
        }
    );
};
const generateRefreshToken = () => {
  return crypto.randomBytes(64).toString('hex');
};

module.exports = { generateAccessToken, generateRefreshToken };