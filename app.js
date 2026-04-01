const express = require('express');
const cors = require('cors');

const registerRoutes = require('./routes');

function createApp() {
  const app = express();

  // Core middleware
  app.use(cors());
  app.use(express.json());

  // Health check
  app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  // API routes
  registerRoutes(app);

  return app;
}

module.exports = createApp;

 