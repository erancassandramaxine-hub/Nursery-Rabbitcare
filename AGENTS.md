# Rabbit nursery backend

This repository is a CommonJS Node.js, Express 5, and Mongoose API for cage sensor readings, controls, users, and maternal activity analysis.

## Project map

- `app.js` creates the Express app; `routes/index.js` mounts the API routes.
- `server.js` connects to MongoDB and creates the optional admin account before listening on `PORT` (default `4000`).
- `database.js` defines the Mongoose models and database connection.
- `routes/` contains HTTP handlers; `middleware/auth.js` handles JWT roles and the sensor API key.
- `sensors/sensorListener.js` handles serial input; its initialization is currently commented out in `server.js`.
- `.env.example` documents local configuration; `docker-compose.yml` runs MongoDB and the API.

## Work in this repository

- Use `npm start` for the API and `npm run dev` for nodemon. There is currently no `npm test` script.
- Keep route payloads and response shapes compatible with callers unless a change is requested.
- For authentication or user changes, check both route-level and mount-level middleware in `routes/index.js`.
- Never commit real credentials or API keys. Use `.env.example` for variable names and examples.
- Do not assume serial ingestion is active merely because the listener exists.

## Local skills

- Read `.agents/skills/accounts-access/SKILL.md` for login, users, roles, password reset, or email flows.
- Read `.agents/skills/device-ingestion/SKILL.md` for sensor and control POST endpoints, serial parsing, or device authentication.
- Read `.agents/skills/metrics-analysis/SKILL.md` for latest readings, chart metrics, thresholds, or maternal visit analysis.
- Read `.agents/skills/backend-runtime/SKILL.md` for startup, MongoDB connection, environment settings, or Docker deployment.

Each skill is a separate folder with its own `SKILL.md` and `agents/openai.yaml`. Load only the skills relevant to the task; a change spanning areas may require more than one.
