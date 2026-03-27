const jwt = require('jsonwebtoken');

const signToken = (payload) => {
  const data = typeof payload === 'object' ? payload : { id: payload };
  return jwt.sign(data, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
  });
};

const verifyToken = (token) => {
  return new Promise((resolve, reject) => {
    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
      if (err) return reject(err);
      resolve(decoded);
    });
  });
};

module.exports = { signToken, verifyToken };
