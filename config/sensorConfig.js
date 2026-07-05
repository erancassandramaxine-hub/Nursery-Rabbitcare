module.exports = {
  port: process.env.SENSOR_PORT || 'COM7',
  baudRate: Number(process.env.SENSOR_BAUD_RATE) || 9600,
  saveIntervalMs: Number(process.env.SENSOR_SAVE_INTERVAL_MS) || 60000,
  conditionalSaveIntervalMs: Number(process.env.SENSOR_CONDITIONAL_SAVE_INTERVAL_MS) || 30000,
  weightThresholdGrams: Number(process.env.SENSOR_WEIGHT_THRESHOLD_GRAMS) || 0,
  temperatureThresholdDown: Number(process.env.TEMPERATURE_THRESHOLD_DOWN) || 0,
  temperatureThresholdUp: Number(process.env.TEMPERATURE_THRESHOLD_UP) || 0,
  sensorId: process.env.SENSOR_ID || 'DHT11_01',
  cage: Number(process.env.SENSOR_CAGE) || 1,
  isControllerConnected: process.env.IS_CONTROLLER_CONNECTED || false,
};

