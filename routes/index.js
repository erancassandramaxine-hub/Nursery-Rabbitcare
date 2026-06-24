const authRouter = require('./auth');
const metricsRouter = require('./metrics');
const dataRouter = require('./data');
const weightRouter = require('./weight');
const { authRequired, adminOnly } = require('../middleware/auth');

function registerRoutes(app) {
  // Connection test — no auth required, for Arduino/device reachability checks
  app.get('/api/ping', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Auth routes
  app.use('/api/auth', authRouter);

  // Sensor data ingest
  app.use('/api/data', dataRouter);
  app.use('/api/data/weight', weightRouter);

  // Protected API routes (admin-only)
  app.use('/api/metrics', authRequired, adminOnly, metricsRouter);
}

module.exports = registerRoutes;
