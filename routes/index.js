const authRouter = require('./auth');
const metricsRouter = require('./metrics');
const { authRequired, adminOnly } = require('../middleware/auth');

function registerRoutes(app) {
  // Auth routes
  app.use('/api/auth', authRouter);

  // Protected API routes (admin-only)
  app.use('/api/metrics', authRequired, adminOnly, metricsRouter);
}

module.exports = registerRoutes;
