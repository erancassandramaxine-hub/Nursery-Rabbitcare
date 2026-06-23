const express = require('express');
const { SensorData } = require('../database');
const sensorConfig = require('../config/sensorConfig');

const router = express.Router();

// POST /api/data/temperature-humidity
// Body: { "temperature": number, "humidity": number }  (see events/temperature.json)
router.post('/temperature-humidity', async (req, res) => {
  const { temperature, humidity } = req.body;

  if (typeof temperature !== 'number' || typeof humidity !== 'number') {
    return res.status(400).json({ error: '"temperature" and "humidity" must be numbers' });
  }

  try {
    const doc = await new SensorData({
      temperature,
      humidity,
      metadata: { sensorId: sensorConfig.sensorId },
    }).save();

    return res.status(201).json({ id: doc._id, timestamp: doc.timestamp });
  } catch (err) {
    console.error('Error saving sensor data:', err);
    return res.status(500).json({ error: 'Failed to save sensor data' });
  }
});

module.exports = router;
