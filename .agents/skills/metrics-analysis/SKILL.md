---
name: metrics-analysis
description: Use when changing latest readings, chart metrics, threshold settings, or maternal visit analysis in the rabbit nursery backend.
---

# Metrics and analysis

Trace readers in routes/latest.js, routes/metrics.js, and routes/analysis.js back to the SensorData, WeightMotionData, and ThresholdSettings models in database.js. Check route mounts in routes/index.js for authentication.

Preserve timestamp inputs and outputs, cage filters, ordering, pagination, and chart interval names unless the task requests a change. Check empty data and range boundaries. Maternal visits are grouped using a 30-second gap; changes to that rule affect duration and summary results.

For thresholds, distinguish persisted ThresholdSettings values from environment defaults in config/sensorConfig.js. Verify calculations against small, hand-checkable reading sets, including boundary times and missing data. MongoDB integration behavior requires a running database.
