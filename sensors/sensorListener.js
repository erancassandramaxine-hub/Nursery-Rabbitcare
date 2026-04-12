const { SerialPort } = require('serialport');
const { ReadlineParser } = require('@serialport/parser-readline');
const sensorConfig = require('../config/sensorConfig');

function initSensorListener(io, SensorData, options = {}) {
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

  // Read every line of serial data
  parser.on('data', (rawData) => {
    let parseData;
    try {
      parseData = JSON.parse(rawData);
    } catch (e) {
      console.warn('Invalid JSON from sensor:', rawData);
      return;
    }

    const { h, t, fan_status, sensor, heater_status } = parseData;

    if (!isNaN(h) && !isNaN(t)) {
      const payload = { 
        h, 
        t, 
        timestamp: new Date(), 
        fan_status,
        heater_status,
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

