const http = require('http');
const { Server } = require('socket.io');
const { connectDB, SensorData, ensureAdminUser } = require('./database');
const createApp = require('./app');
const { initSensorListener } = require('./sensors/sensorListener');

async function startServer() {
  // Connect to database and ensure default admin
  await connectDB();
  await ensureAdminUser();

  // Initialize infrastructure
  const app = createApp();
  const server = http.createServer(app);
  const io = new Server(server, { cors: { origin: '*' } });

  // Track websocket client connections
  io.on('connection', (socket) => {
    console.log(`[WS] Client connected: ${socket.id} | total: ${io.engine.clientsCount}`);

    socket.on('disconnect', (reason) => {
      console.log(`[WS] Client disconnected: ${socket.id} (${reason}) | total: ${io.engine.clientsCount}`);
    });
  });

  // Initialize sensor listener (serial port + buffering + DB writes)
  initSensorListener(io, SensorData);

  // Start HTTP server
  const PORT = process.env.PORT || 4000;
  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});