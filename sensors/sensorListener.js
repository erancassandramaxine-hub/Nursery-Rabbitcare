const { SerialPort } = require('serialport');
const { ReadlineParser } = require('@serialport/parser-readline');
const sensorConfig = require('../config/sensorConfig');

function initSensorListener(io, SensorData, options = {}) {
  const {
    port = sensorConfig.port,
    baudRate = sensorConfig.baudRate,
    saveIntervalMs = sensorConfig.saveIntervalMs,
  } = options;

  // Serial setup
  const arduinoSerial = new SerialPort({ path: port, baudRate });
  const parser = arduinoSerial.pipe(new ReadlineParser({ delimiter: '\r\n' }));

  // Buffer and timing for DB writes
  let dataBuffer = [];
  let lastSaveTime = Date.now();

  // Read every line of serial data
  parser.on('data', (rawLine) => {
    const [h, t] = rawLine.split(',').map(Number);

    if (!isNaN(h) && !isNaN(t)) {
      const payload = { h, t, timestamp: new Date() };

      // Broadcast instantly via Socket.IO with renamed event
      io.emit('temperature-humidity', payload);

      // Buffer for minute-average persistence
      dataBuffer.push({ h, t });

      console.log('Data received from sensor: ', payload);

      if (Date.now() - lastSaveTime >= saveIntervalMs) {
        saveAverageToDB();
      }
    }
  });

  async function saveAverageToDB() {
    if (dataBuffer.length === 0) return;

    const avgH = (dataBuffer.reduce((a, b) => a + b.h, 0) / dataBuffer.length).toFixed(2);
    const avgT = (dataBuffer.reduce((a, b) => a + b.t, 0) / dataBuffer.length).toFixed(2);

    try {
      await new SensorData({
        humidity: parseFloat(avgH),
        temperature: parseFloat(avgT),
        metadata: { sensorId: sensorConfig.sensorId, samples: dataBuffer.length },
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

