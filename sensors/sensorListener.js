const { SerialPort } = require('serialport');
const { ReadlineParser } = require('@serialport/parser-readline');
const sensorConfig = require('../config/sensorConfig');

function initSensorListener(SensorData, WeightMotionData, options = {}) {
  if (!sensorConfig.isControllerConnected) {
    return { close: () => {} };
  }

  const {
    port = sensorConfig.port,
    baudRate = sensorConfig.baudRate,
    saveIntervalMs = sensorConfig.saveIntervalMs,
    conditionalSaveIntervalMs = sensorConfig.conditionalSaveIntervalMs,
    weightThresholdGrams = sensorConfig.weightThresholdGrams,
  } = options;

  const arduinoSerial = new SerialPort({ path: port, baudRate });
  const parser = arduinoSerial.pipe(new ReadlineParser({ delimiter: '\r\n' }));

  arduinoSerial.on('error', (err) => {
    console.error('Serial port error:', err);
  });

  let dataBuffer = [];
  let lastSaveTime = Date.now();
  let lastConditionalSaveTime = null;

  parser.on('data', (rawData) => {
    let parseData;
    try {
      parseData = JSON.parse(rawData);
    } catch (e) {
      console.warn('Invalid JSON from sensor:', rawData);
      return;
    }

    const { h, t, w, sensor } = parseData;

    handleConditionalWeightSave({ w, sensor });

    if (!isNaN(h) && !isNaN(t)) {
      dataBuffer.push({ h, t, sensor });

      if (Date.now() - lastSaveTime >= saveIntervalMs) {
        saveAverageToDB();
      }
    }
  });

  async function saveAverageToDB() {
    if (dataBuffer.length === 0) return;

    const avgH = (dataBuffer.reduce((a, b) => a + b.h, 0) / dataBuffer.length).toFixed(2);
    const avgT = (dataBuffer.reduce((a, b) => a + b.t, 0) / dataBuffer.length).toFixed(2);

    const latestSensor =
      [...dataBuffer].reverse().find((item) => typeof item.sensor === 'string' && item.sensor.trim())?.sensor
      || sensorConfig.sensorId;

    try {
      await new SensorData({
        cage: sensorConfig.cage,
        humidity: parseFloat(avgH),
        temperature: parseFloat(avgT),
        samples: dataBuffer.length,
      }).save();

      console.log(`[DB] Saved 5-min average: ${avgT}°C`);
      dataBuffer = [];
      lastSaveTime = Date.now();
    } catch (e) {
      console.error(e);
    }
  }

  async function handleConditionalWeightSave({ w, sensor }) {
    if (!WeightMotionData) return;

    const weight = Number(w);
    const now = Date.now();

    if (Number.isNaN(weight) || weight < weightThresholdGrams) {
      lastConditionalSaveTime = null;
      return;
    }

    if (lastConditionalSaveTime === null) {
      lastConditionalSaveTime = now;
      console.log(`[DB] Weight threshold met, starting save cycle (every ${conditionalSaveIntervalMs}ms): ${weight}g`);
      return;
    }

    if (now - lastConditionalSaveTime < conditionalSaveIntervalMs) return;

    try {
      await new WeightMotionData({
        cage: sensorConfig.cage,
        weight,
      }).save();

      lastConditionalSaveTime = now;
      console.log(`[DB] Saved weight snapshot: ${weight}g`);
    } catch (e) {
      console.error('Failed to save weight snapshot:', e);
    }
  }

  return {
    close: () => {
      try {
        arduinoSerial.close();
      } catch (e) {
        console.error('Error closing serial port:', e);
      }
    },
  };
}

module.exports = { initSensorListener };
