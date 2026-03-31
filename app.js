const express = require('express');
const cors = require('cors');

const metricsRouter = require('./routes/metrics');
const authRouter = require('./routes/auth');
const { authRequired, adminOnly } = require('./middleware/auth');

function createApp() {
  const app = express();

  // Core middleware
  app.use(cors());
  app.use(express.json());

  // Health check
  app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  // Auth routes
  app.use('/api/auth', authRouter);

  // Protected API routes (admin-only)
  app.use('/api/metrics', authRequired, adminOnly, metricsRouter);

  return app;
}

module.exports = createApp;

 