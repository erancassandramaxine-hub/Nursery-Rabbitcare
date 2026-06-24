const { connectDB, SensorData, WeightMotionData, ensureAdminUser } = require('./database');
const createApp = require('./app');
const { initSensorListener } = require('./sensors/sensorListener');

async function startServer() {
  await connectDB();
  await ensureAdminUser();

  const app = createApp();

  // initSensorListener(SensorData, WeightMotionData);

  const PORT = process.env.PORT || 4000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
