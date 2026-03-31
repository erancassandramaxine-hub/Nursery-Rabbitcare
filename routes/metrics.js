const express = require('express');
const { SensorData } = require('../database');

const router = express.Router();

// GET /api/metrics/temperature-humidity
// Fetch temperature & humidity data for charts
// Default: last 24 hours
// Optional query params:
//   limit: max number of records (default 100, max 1000)
//   from: ISO date string for start timestamp (inclusive)
//   to: ISO date string for end timestamp (inclusive)
router.get('/temperature-humidity', async (req, res) => {
  try {
    const { limit = 100, from, to } = req.query;

    const query = {};

    let fromDate;
    let toDate;

    if (from) {
      const d = new Date(from);
      if (!isNaN(d.getTime())) fromDate = d;
    }

    if (to) {
      const d = new Date(to);
      if (!isNaN(d.getTime())) toDate = d;
    }

    // Default to last 24 hours if no valid range provided
    if (!fromDate && !toDate) {
      toDate = new Date();
      fromDate = new Date(toDate.getTime() - 24 * 60 * 60 * 1000);
    }

    if (fromDate || toDate) {
      query.timestamp = {};
      if (fromDate) query.timestamp.$gte = fromDate;
      if (toDate) query.timestamp.$lte = toDate;
    }

    const docs = await SensorData
      .find(query)
      .sort({ timestamp: 1 })
      .limit(Math.min(parseInt(limit, 10) || 100, 1000));

    const formatted = docs.map((doc) => {
      const ts = doc.timestamp ? new Date(doc.timestamp) : null;

      return {
        id: doc._id,
        humidity: doc.humidity,
        temperature: doc.temperature,
        // Keep ISO for precise frontend parsing/sorting
        timestamp: ts ? ts.toISOString() : null,
        // Human-readable label for chart display
        timestampLabel: ts
          ? ts.toLocaleString('en-US', {
              year: 'numeric',
              month: 'short',
              day: '2-digit',
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
              hour12: true,
            })
          : null,
      };
    });

    res.json(formatted);
  } catch (err) {
    console.error('Error fetching sensor data:', err);
    res.status(500).json({ error: 'Failed to fetch sensor data' });
  }
});

module.exports = router;

