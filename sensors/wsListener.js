const sensorConfig = require('../config/sensorConfig');

// Handles real-time sensor data emitted by Arduino over WebSocket.
// Incoming event: 'sensor-data'  →  schema: events/temperature.json
// Outgoing event: 'temperature-humidity' (same channel as the serial path)
function initWsListener(io, SensorData) {
  io.on('connection', (socket) => {
    socket.on('sensor-data', async (payload) => {
      const { temperature, humidity } = payload || {};

      if (typeof temperature !== 'number' || typeof humidity !== 'number') {
        console.warn('[WS] sensor-data: invalid payload', payload);
        return;
      }

      try {
        await new SensorData({
          temperature,
          humidity,
          metadata: { sensorId: sensorConfig.sensorId },
        }).save();
      } catch (err) {
        console.error('[WS] Failed to save sensor-data:', err);
      }

      io.emit('temperature-humidity', {
        t: temperature,
        h: humidity,
        timestamp: new Date(),
      });
    });
  });
}

module.exports = { initWsListener };
