const express = require('express');
const { SensorData, WeightMotionData } = require('../database');
const sensorConfig = require('../config/sensorConfig');

const router = express.Router();

const validIntervals = {
  '1m': 1 * 60 * 1000,
  '5m': 5 * 60 * 1000,
  '30m': 30 * 60 * 1000,
  '1h': 60 * 60 * 1000,
};

function parseTimestamp(value) {
  if (value === undefined || value === null || value === '') return null;

  // Accept Unix timestamp in seconds or milliseconds.
  const numeric = Number(value);
  if (!Number.isNaN(numeric) && Number.isFinite(numeric)) {
    const ms = numeric < 1e12 ? numeric * 1000 : numeric;
    const d = new Date(ms);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  // Backward compatibility for ISO date strings.
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

// GET /api/metrics/temperature-humidity
// Fetch temperature & humidity data for charts
// Default: last 24 hours
// Optional query params:
//   limit: max number of records (default 100, max 1000)
//   from: Unix timestamp (seconds/ms) for start timestamp (inclusive)
//   to: Unix timestamp (seconds/ms) for end timestamp (inclusive)
//   interval: bucket size for aggregated chart data (1m | 5m | 30m | 1h)
router.get('/temperature-humidity', async (req, res) => {
  try {
    const { limit = 100, from, to, interval } = req.query;
    const intervalMs = interval ? validIntervals[String(interval)] : null;

    if (interval && !intervalMs) {
      return res.status(400).json({ error: 'Invalid interval. Use 1m, 5m, 30m, or 1h' });
    }

    const query = {};

    let fromDate = parseTimestamp(from);
    let toDate = parseTimestamp(to);

    if ((from && !fromDate) || (to && !toDate)) {
      return res.status(400).json({
        error: 'Invalid from/to. Use Unix timestamp in seconds or milliseconds',
      });
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

    if (!intervalMs) {
      return res.json(formatted);
    }

    // Bucket readings by selected interval and average values per bucket.
    const buckets = new Map();
    for (const row of formatted) {
      if (!row.timestamp) continue;

      const ts = new Date(row.timestamp).getTime();
      if (Number.isNaN(ts)) continue;

      const bucketStartMs = Math.floor(ts / intervalMs) * intervalMs;
      const key = String(bucketStartMs);

      if (!buckets.has(key)) {
        buckets.set(key, {
          timestampMs: bucketStartMs,
          humiditySum: 0,
          humidityCount: 0,
          temperatureSum: 0,
          temperatureCount: 0,
        });
      }

      const bucket = buckets.get(key);

      if (typeof row.humidity === 'number') {
        bucket.humiditySum += row.humidity;
        bucket.humidityCount += 1;
      }

      if (typeof row.temperature === 'number') {
        bucket.temperatureSum += row.temperature;
        bucket.temperatureCount += 1;
      }
    }

    const aggregated = Array.from(buckets.values())
      .sort((a, b) => a.timestampMs - b.timestampMs)
      .map((bucket) => {
        const ts = new Date(bucket.timestampMs);

        return {
          id: String(bucket.timestampMs),
          humidity: bucket.humidityCount ? bucket.humiditySum / bucket.humidityCount : null,
          temperature: bucket.temperatureCount ? bucket.temperatureSum / bucket.temperatureCount : null,
          timestamp: ts.toISOString(),
          timestampLabel: ts.toLocaleString('en-US', {
            year: 'numeric',
            month: 'short',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: true,
          }),
          interval: String(interval),
        };
      });

    return res.json(aggregated);
  } catch (err) {
    console.error('Error fetching sensor data:', err);
    res.status(500).json({ error: 'Failed to fetch sensor data' });
  }
});

// GET /api/metrics/weight-motion
// Fetch weight & motion data for charts
// Default: last 24 hours
// Optional query params:
//   limit: max number of records (default 100, max 1000)
//   from: Unix timestamp (seconds/ms) for start timestamp (inclusive)
//   to: Unix timestamp (seconds/ms) for end timestamp (inclusive)
//   interval: bucket size for aggregated chart data (1m | 5m | 30m | 1h)
router.get('/weight-motion', async (req, res) => {
  try {
    const { limit = 100, from, to, interval } = req.query;
    const intervalMs = interval ? validIntervals[String(interval)] : null;

    if (interval && !intervalMs) {
      return res.status(400).json({ error: 'Invalid interval. Use 1m, 5m, 30m, or 1h' });
    }

    const query = {};
    let fromDate = parseTimestamp(from);
    let toDate = parseTimestamp(to);

    if ((from && !fromDate) || (to && !toDate)) {
      return res.status(400).json({
        error: 'Invalid from/to. Use Unix timestamp in seconds or milliseconds',
      });
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

    const docs = await WeightMotionData
      .find(query)
      .sort({ timestamp: 1 })
      .limit(Math.min(parseInt(limit, 10) || 100, 1000));

    const formatted = docs.map((doc) => {
      const ts = doc.timestamp ? new Date(doc.timestamp) : null;

      return {
        id: doc._id,
        weight: doc.weight,
        motion: doc.motion,
        timestamp: ts ? ts.toISOString() : null,
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

    if (!intervalMs) {
      return res.json(formatted);
    }

    // Bucket readings by selected interval and average values per bucket.
    const buckets = new Map();
    for (const row of formatted) {
      if (!row.timestamp) continue;

      const ts = new Date(row.timestamp).getTime();
      if (Number.isNaN(ts)) continue;

      const bucketStartMs = Math.floor(ts / intervalMs) * intervalMs;
      const key = String(bucketStartMs);

      if (!buckets.has(key)) {
        buckets.set(key, {
          timestampMs: bucketStartMs,
          weightSum: 0,
          weightCount: 0,
          motionSum: 0,
          motionCount: 0,
        });
      }

      const bucket = buckets.get(key);

      if (typeof row.weight === 'number') {
        bucket.weightSum += row.weight;
        bucket.weightCount += 1;
      }

      if (typeof row.motion === 'number') {
        bucket.motionSum += row.motion;
        bucket.motionCount += 1;
      }
    }

    const aggregated = Array.from(buckets.values())
      .sort((a, b) => a.timestampMs - b.timestampMs)
      .map((bucket) => {
        const ts = new Date(bucket.timestampMs);

        return {
          id: String(bucket.timestampMs),
          weight: bucket.weightCount ? bucket.weightSum / bucket.weightCount : null,
          motion: bucket.motionCount ? bucket.motionSum / bucket.motionCount : null,
          timestamp: ts.toISOString(),
          timestampLabel: ts.toLocaleString('en-US', {
            year: 'numeric',
            month: 'short',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: true,
          }),
          interval: String(interval),
        };
      });

    return res.json(aggregated);
  } catch (err) {
    console.error('Error fetching weight/motion data:', err);
    res.status(500).json({ error: 'Failed to fetch weight/motion data' });
  }
});

// GET /api/metrics/thresholds
// Returns thresholds from env-backed sensor config.
router.get('/thresholds', async (req, res) => {
  try {
    return res.json({
      weightThresholdGrams: sensorConfig.weightThresholdGrams,
      temperatureThresholdDown: sensorConfig.temperatureThresholdDown,
      temperatureThresholdUp: sensorConfig.temperatureThresholdUp,
    });
  } catch (err) {
    console.error('Error fetching thresholds:', err);
    return res.status(500).json({ error: 'Failed to fetch thresholds' });
  }
});

module.exports = router;

