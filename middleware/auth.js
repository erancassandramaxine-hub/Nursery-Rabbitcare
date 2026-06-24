const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';
const SENSOR_API_KEY = process.env.SENSOR_API_KEY;

function authRequired(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'Authorization token missing' });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

function adminOnly(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

function sensorApiKeyRequired(req, res, next) {
  if (!SENSOR_API_KEY) {
    console.warn('SENSOR_API_KEY is not set; sensor endpoint is unprotected');
    return next();
  }

  const key = req.headers['x-api-key'];
  if (!key || key !== SENSOR_API_KEY) {
    return res.status(401).json({ error: 'Invalid or missing API key' });
  }

  next();
}

module.exports = { authRequired, adminOnly, sensorApiKeyRequired, JWT_SECRET };

