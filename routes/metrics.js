const express = require('express');
const { SensorData, WeightMotionData, ThresholdSettings } = require('../database');
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
        cage: doc.cage,
        humidity: Math.round(doc.humidity * 100) / 100,
        temperature: Math.round(doc.temperature * 100) / 100,
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

    // Bucket readings by cage + interval so cage1 and cage2 are never averaged together.
    const buckets = new Map();
    for (const row of formatted) {
      if (!row.timestamp) continue;

      const ts = new Date(row.timestamp).getTime();
      if (Number.isNaN(ts)) continue;

      const bucketStartMs = Math.floor(ts / intervalMs) * intervalMs;
      const key = `${row.cage}-${bucketStartMs}`;

      if (!buckets.has(key)) {
        buckets.set(key, {
          cage: row.cage,
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
      .sort((a, b) => a.cage - b.cage || a.timestampMs - b.timestampMs)
      .map((bucket) => {
        const ts = new Date(bucket.timestampMs);

        return {
          id: `${bucket.cage}-${bucket.timestampMs}`,
          cage: bucket.cage,
          humidity: bucket.humidityCount ? Math.round((bucket.humiditySum / bucket.humidityCount) * 100) / 100 : null,
          temperature: bucket.temperatureCount ? Math.round((bucket.temperatureSum / bucket.temperatureCount) * 100) / 100 : null,
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

// GET /api/metrics/weight
// Fetch weight data for charts
// Default: last 24 hours
// Optional query params:
//   limit: max number of records (default 100, max 1000)
//   from: Unix timestamp (seconds/ms) for start timestamp (inclusive)
//   to: Unix timestamp (seconds/ms) for end timestamp (inclusive)
//   interval: bucket size for aggregated chart data (1m | 5m | 30m | 1h)
router.get('/weight', async (req, res) => {
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
        });
      }

      const bucket = buckets.get(key);

      if (typeof row.weight === 'number') {
        bucket.weightSum += row.weight;
        bucket.weightCount += 1;
      }
    }

    const aggregated = Array.from(buckets.values())
      .sort((a, b) => a.timestampMs - b.timestampMs)
      .map((bucket) => {
        const ts = new Date(bucket.timestampMs);

        return {
          id: String(bucket.timestampMs),
          weight: bucket.weightCount ? bucket.weightSum / bucket.weightCount : null,
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
    console.error('Error fetching weight data:', err);
    res.status(500).json({ error: 'Failed to fetch weight data' });
  }
});

// GET /api/metrics/thresholds
// Returns current thresholds. DB values take precedence over env defaults.
router.get('/thresholds', async (req, res) => {
  try {
    const saved = await ThresholdSettings.findOne();
    return res.json({
      temperatureThresholdDown: saved?.temperatureThresholdDown ?? sensorConfig.temperatureThresholdDown,
      temperatureThresholdUp:   saved?.temperatureThresholdUp   ?? sensorConfig.temperatureThresholdUp,
      weightThresholdGrams:     saved?.weightThresholdGrams     ?? sensorConfig.weightThresholdGrams,
      updatedAt: saved?.updatedAt ?? null,
    });
  } catch (err) {
    console.error('Error fetching thresholds:', err);
    return res.status(500).json({ error: 'Failed to fetch thresholds' });
  }
});

// PUT /api/metrics/thresholds
// Admin sets temperature (low/high) and weight-ignore thresholds. Persisted to DB.
// Body: { temperatureThresholdDown: number, temperatureThresholdUp: number, weightThresholdGrams: number }
router.put('/thresholds', async (req, res) => {
  try {
    const { temperatureThresholdDown, temperatureThresholdUp, weightThresholdGrams } = req.body;

    const errors = [];
    if (typeof temperatureThresholdDown !== 'number') errors.push('"temperatureThresholdDown" must be a number');
    if (typeof temperatureThresholdUp !== 'number')   errors.push('"temperatureThresholdUp" must be a number');
    if (typeof weightThresholdGrams !== 'number')     errors.push('"weightThresholdGrams" must be a number');
    if (errors.length) return res.status(400).json({ error: errors.join('; ') });

    if (weightThresholdGrams < 0) {
      return res.status(400).json({ error: '"weightThresholdGrams" must be >= 0' });
    }
    if (temperatureThresholdDown >= temperatureThresholdUp) {
      return res.status(400).json({ error: '"temperatureThresholdDown" must be less than "temperatureThresholdUp"' });
    }

    const updated = await ThresholdSettings.findOneAndUpdate(
      {},
      { temperatureThresholdDown, temperatureThresholdUp, weightThresholdGrams, updatedAt: new Date() },
      { upsert: true, new: true }
    );

    return res.json({
      temperatureThresholdDown: updated.temperatureThresholdDown,
      temperatureThresholdUp:   updated.temperatureThresholdUp,
      weightThresholdGrams:     updated.weightThresholdGrams,
      updatedAt: updated.updatedAt,
    });
  } catch (err) {
    console.error('Error saving thresholds:', err);
    return res.status(500).json({ error: 'Failed to save thresholds' });
  }
});

module.exports = router;

