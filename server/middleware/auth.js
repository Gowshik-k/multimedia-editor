const jwt = require('jsonwebtoken');
const dataStore = require('../models/dataStore');

const JWT_SECRET = process.env.JWT_SECRET || 'omnimedia_jwt_secret_key_2026';

async function authMiddleware(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Authorization token required' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);

    const user = await dataStore.findUserById(decoded.id);
    if (!user) {
      return res.status(401).json({ message: 'User not found or session expired' });
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid or expired token', error: err.message });
  }
}

// Optional auth for public preview or guest
function optionalAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, JWT_SECRET);
      dataStore.findUserById(decoded.id).then(user => {
        if (user) req.user = user;
        next();
      }).catch(() => next());
    } else {
      next();
    }
  } catch (e) {
    next();
  }
}

module.exports = { authMiddleware, optionalAuth, JWT_SECRET };

