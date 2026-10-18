---
name: backend-runtime
description: Use when changing backend startup, MongoDB connection, environment configuration, or Docker deployment in the rabbit nursery backend.
---

# Backend runtime

Start with server.js, app.js, database.js, .env.example, Dockerfile, and docker-compose.yml. npm start runs node server.js; npm run dev uses nodemon. There is currently no npm test script.

Startup calls connectDB and ensureAdminUser before listening. Inspect error handling before assuming a failed database connection stops startup. The health route is in app.js; check what it actually proves before using it as a database readiness signal.

Keep development examples separate from real credentials. Check environment variable names across .env.example, config/sensorConfig.js, middleware/auth.js, and docker-compose.yml when changing configuration. The serial listener is currently disabled in server.js; Docker device mapping is commented out.

Verify configuration with the relevant local command or container setup. Report when MongoDB, serial hardware, or Docker was unavailable rather than treating a file check as a runtime check.
