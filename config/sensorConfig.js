module.exports = {
  port: process.env.SENSOR_PORT || 'COM7',
  baudRate: Number(process.env.SENSOR_BAUD_RATE) || 9600,
  saveIntervalMs: Number(process.env.SENSOR_SAVE_INTERVAL_MS) || 60000,
  sensorId: process.env.SENSOR_ID || 'DHT11_01',
};

