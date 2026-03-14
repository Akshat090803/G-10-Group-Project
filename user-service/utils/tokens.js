const JWT = require('jsonwebtoken');

const createAccessToken = (userID, role, tokenVersion) => {
  return JWT.sign(
    { sub: userID, role, tokenVersion },
    process.env.JWT_ACCESS_SECRET || 'fallback_access_secret',
    { expiresIn: '30m' }
  );
};

const createRefreshToken = (userID, tokenVersion, jti) => {
  return JWT.sign(
    { sub: userID, tokenVersion, jti },
    process.env.JWT_REFRESH_SECRET || 'fallback_refresh_secret',
    { expiresIn: '7d' }
  );
};

const verifyRefreshToken = (token) => {
  return JWT.verify(token, process.env.JWT_REFRESH_SECRET || 'fallback_refresh_secret');
};

const verifyAccessToken = (token) => {
  return JWT.verify(token, process.env.JWT_ACCESS_SECRET || 'fallback_access_secret');
};

module.exports = { createAccessToken, createRefreshToken, verifyRefreshToken, verifyAccessToken };