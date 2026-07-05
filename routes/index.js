const authRouter = require('./auth');
const metricsRouter = require('./metrics');
const dataRouter = require('./data');
const weightRouter = require('./weight');
const latestRouter = require('./latest');
const usersRouter = require('./users');
const analysisRouter = require('./analysis');
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

  // Latest readings — accessible by any authenticated user (admin or user role)
  app.use('/api/latest', authRequired, latestRouter);

  // Protected API routes (admin-only)
  app.use('/api/metrics', authRequired, adminOnly, metricsRouter);
  app.use('/api/users', authRequired, adminOnly, usersRouter);

  // Analysis — accessible by any authenticated user (admin or user role)
  app.use('/api/analysis', authRequired, analysisRouter);
}

module.exports = registerRoutes;
