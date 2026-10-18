---
name: device-ingestion
description: Use when changing sensor readings, weight or control POST endpoints, serial input, or device API-key handling in the rabbit nursery backend.
---

# Device ingestion

Identify the active input path. Devices POST through routes/data.js, routes/weight.js, and routes/control.js. sensors/sensorListener.js is a separate serial path, but initialization is commented out in server.js. Do not enable it as a side effect.

Trace each payload through middleware/auth.js, route validation, and the SensorData, WeightMotionData, or ControlStatus model in database.js. Preserve cage 1 and cage 2 payload shapes, units, and response timestamps unless the task requests a contract change. Device POST routes use x-api-key when SENSOR_API_KEY is configured.

For serial work, inspect config/sensorConfig.js and the buffering and conditional save intervals in sensors/sensorListener.js. Check malformed JSON, missing values, and threshold boundary cases with representative readings. Verify HTTP and serial paths separately; one does not prove the other.
