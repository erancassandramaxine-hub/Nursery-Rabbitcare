const express = require('express');
const { WeightMotionData } = require('../database');
const { sensorApiKeyRequired } = require('../middleware/auth');

const router = express.Router();

function validateCagePayload(obj, name) {
  if (!obj || typeof obj !== 'object') return `"${name}" is required`;
  if (typeof obj.weight !== 'number') return `"${name}.weight" must be a number`;
  if (obj.motion !== undefined && typeof obj.motion !== 'number') return `"${name}.motion" must be a number`;
  return null;
}

// POST /api/data/weight
// Body: {
//   cage1: { weight: number, motion?: number },
//   cage2?: { weight: number, motion?: number }
// }
router.post('/', sensorApiKeyRequired, async (req, res) => {
  const { cage1, cage2 } = req.body;

  const err1 = validateCagePayload(cage1, 'cage1');
  const err2 = cage2 ? validateCagePayload(cage2, 'cage2') : null;
  if (err1 || err2) {
    return res.status(400).json({ error: [err1, err2].filter(Boolean).join('; ') });
  }

  try {
    const saves = [
      new WeightMotionData({
        cage: 1,
        weight: cage1.weight,
        ...(typeof cage1.motion === 'number' && { motion: cage1.motion }),
      }).save(),
    ];

    if (cage2) {
      saves.push(new WeightMotionData({
        cage: 2,
        weight: cage2.weight,
        ...(typeof cage2.motion === 'number' && { motion: cage2.motion }),
      }).save());
    }

    const [doc1, doc2] = await Promise.all(saves);

    return res.status(201).json({
      cage1: { id: doc1._id, timestamp: doc1.timestamp },
      ...(doc2 && { cage2: { id: doc2._id, timestamp: doc2.timestamp } }),
    });
  } catch (err) {
    console.error('Error saving weight data:', err);
    return res.status(500).json({ error: 'Failed to save weight data' });
  }
});

module.exports = router;
