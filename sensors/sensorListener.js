const { SerialPort } = require('serialport');
const { ReadlineParser } = require('@serialport/parser-readline');
const sensorConfig = require('../config/sensorConfig');

function initSensorListener(io, SensorData, WeightMotionData, options = {}) {
  const emitSensorStatus = (connected, reason = null) => {
    io.emit('sensor-status', {
      connected,
      reason,
      timestamp: new Date(),
    });
  };

  if (!sensorConfig.isControllerConnected) {
    emitSensorStatus(false, 'controller-not-connected');
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

  // Serial setup
  const arduinoSerial = new SerialPort({ path: port, baudRate });
  const parser = arduinoSerial.pipe(new ReadlineParser({ delimiter: '\r\n' }));

  arduinoSerial.on('open', () => {
    emitSensorStatus(true);
  });

  arduinoSerial.on('close', () => {
    emitSensorStatus(false, 'serial-port-closed');
  });

  arduinoSerial.on('error', (err) => {
    console.error('Serial port error:', err);
    emitSensorStatus(false, err?.message || 'serial-port-error');
  });

  // Buffer and timing for DB writes
  let dataBuffer = [];
  let lastSaveTime = Date.now();
  let lastConditionalSaveTime = null;
  let consecutiveZeroMotionCount = 0;

  // Read every line of serial data
  parser.on('data', (rawData) => {
    let parseData;
    try {
      parseData = JSON.parse(rawData);
    } catch (e) {
      console.warn('Invalid JSON from sensor:', rawData);
      return;
    }

    const { h, t, fan_status, sensor, heater_status, w, m } = parseData;
    const weight = Number(w);
    const motion = Number(m);
    const emittedWeight = !Number.isNaN(weight) && weight <= weightThresholdGrams ? 0 : w;
    const possibleVisit = getRealtimePossibleVisit(weight, motion);

    handleConditionalWeightMotionSave({ w, m, sensor });

    // Always emit visit state for real-time FE indicators.
    io.emit('possible-visit', {
      possibleVisit,
      w: emittedWeight,
      m,
      threshold: weightThresholdGrams,
      timestamp: new Date(),
    });

    if (!isNaN(h) && !isNaN(t)) {
      const payload = { 
        h, 
        t, 
        timestamp: new Date(), 
        fan_status,
        heater_status,
        w: emittedWeight,
        m,
        possibleVisit,
      };

      // Broadcast instantly via Socket.IO with renamed event
      io.emit('temperature-humidity', payload);
      emitSensorStatus(true);

      // Buffer for minute-average persistence
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
        humidity: parseFloat(avgH),
        temperature: parseFloat(avgT),
        metadata: { sensorId: latestSensor, samples: dataBuffer.length },
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

    // Start cycle only when motion is detected.
    if (lastConditionalSaveTime === null) {
      if (motion !== 1) return;

      lastConditionalSaveTime = now;
      consecutiveZeroMotionCount = 0;
      console.log(
        `[DB] Condition met, starting weight/motion save cycle (every ${conditionalSaveIntervalMs}ms): ${weight}g, motion=${motion}`
      );
      return;
    }

    // While cycle is active, tolerate brief motion drops (m=0).
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
        weight,
        motion,
        metadata: { sensorId: latestSensor },
      }).save();

      lastConditionalSaveTime = now;
      console.log(`[DB] Saved weight/motion snapshot: ${weight}g, motion=${motion}`);
    } catch (e) {
      console.error('Failed to save weight/motion snapshot:', e);
    }
  }

  function getRealtimePossibleVisit(weight, motion) {
    const isWeightPassed = !Number.isNaN(weight) && weight >= weightThresholdGrams;
    const isMotionValid = !Number.isNaN(motion) && (motion === 0 || motion === 1);

    if (!isWeightPassed || !isMotionValid) return false;
    if (motion === 1) return true;
    if (lastConditionalSaveTime === null) return false;

    // Predict the next zero-motion count to match tolerance behavior in save logic.
    return (consecutiveZeroMotionCount + 1) <= motionZeroToleranceCount;
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

