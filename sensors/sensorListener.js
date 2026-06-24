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
    motionZeroToleranceCount = sensorConfig.motionZeroToleranceCount,
  } = options;

  const arduinoSerial = new SerialPort({ path: port, baudRate });
  const parser = arduinoSerial.pipe(new ReadlineParser({ delimiter: '\r\n' }));

  arduinoSerial.on('error', (err) => {
    console.error('Serial port error:', err);
  });

  let dataBuffer = [];
  let lastSaveTime = Date.now();
  let lastConditionalSaveTime = null;
  let consecutiveZeroMotionCount = 0;

  parser.on('data', (rawData) => {
    let parseData;
    try {
      parseData = JSON.parse(rawData);
    } catch (e) {
      console.warn('Invalid JSON from sensor:', rawData);
      return;
    }

    const { h, t, w, m, sensor } = parseData;

    handleConditionalWeightMotionSave({ w, m, sensor });

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

  async function handleConditionalWeightMotionSave({ w, m, sensor }) {
    if (!WeightMotionData) return;

    const weight = Number(w);
    const motion = Number(m);
    const now = Date.now();
    const isWeightPassed = !Number.isNaN(weight) && weight >= weightThresholdGrams;
    const isMotionValid = !Number.isNaN(motion) && (motion === 0 || motion === 1);

    if (!isWeightPassed || !isMotionValid) {
      lastConditionalSaveTime = null;
      consecutiveZeroMotionCount = 0;
      return;
    }

    if (lastConditionalSaveTime === null) {
      if (motion !== 1) return;

      lastConditionalSaveTime = now;
      consecutiveZeroMotionCount = 0;
      console.log(
        `[DB] Condition met, starting weight/motion save cycle (every ${conditionalSaveIntervalMs}ms): ${weight}g, motion=${motion}`
      );
      return;
    }

    if (motion === 1) {
      consecutiveZeroMotionCount = 0;
    } else {
      consecutiveZeroMotionCount += 1;
      if (consecutiveZeroMotionCount > motionZeroToleranceCount) {
        console.log(
          `[DB] Stopping weight/motion save cycle: motion stayed 0 beyond tolerance (${motionZeroToleranceCount})`
        );
        lastConditionalSaveTime = null;
        consecutiveZeroMotionCount = 0;
        return;
      }
    }

    if (now - lastConditionalSaveTime < conditionalSaveIntervalMs) return;

    try {
      const latestSensor = (typeof sensor === 'string' && sensor.trim())
        ? sensor
        : sensorConfig.sensorId;

      await new WeightMotionData({
        cage: sensorConfig.cage,
        weight,
        motion,
      }).save();

      lastConditionalSaveTime = now;
      console.log(`[DB] Saved weight/motion snapshot: ${weight}g, motion=${motion}`);
    } catch (e) {
      console.error('Failed to save weight/motion snapshot:', e);
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
