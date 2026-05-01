const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
require('dotenv').config();

// Define a Time-Series Schema
const sensorSchema = new mongoose.Schema({
  timestamp: { type: Date, default: Date.now },
  metadata: { sensorId: String, location: String },
  humidity: Number,
  temperature: Number
}, { 
  timeseries: { 
    timeField: 'timestamp', 
    metaField: 'metadata', 
    granularity: 'seconds' 
  } 
});

const SensorData = mongoose.model('SensorData', sensorSchema);

const weightMotionSchema = new mongoose.Schema({
  timestamp: { type: Date, default: Date.now },
  metadata: { sensorId: String },
  weight: Number,
  motion: Number,
}, {
  timeseries: {
    timeField: 'timestamp',
    metaField: 'metadata',
    granularity: 'seconds',
  },
});

const WeightMotionData = mongoose.model('WeightMotionData', weightMotionSchema);

// Admin user schema
const adminSchema = new mongoose.Schema({
  email: { type: String, unique: true, required: true },
  passwordHash: { type: String, required: true },
  role: { type: String, default: 'admin' },
  createdAt: { type: Date, default: Date.now },
});

const AdminUser = mongoose.model('AdminUser', adminSchema);

const connectDB = async () => {
  try {
    const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/arduino_iot';
    await mongoose.connect(uri);
    console.log('MongoDB Connected...');
  } catch (err) {
    console.error('MongoDB Connection Error:', err.message);
  }
};

// Ensure a default admin account exists, using env variables
const ensureAdminUser = async () => {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !password) {
    console.warn('ADMIN_EMAIL or ADMIN_PASSWORD not set; skipping default admin creation.');
    return;
  }

  const existing = await AdminUser.findOne({ email });
  if (existing) return;

  const passwordHash = await bcrypt.hash(password, 10);
  await AdminUser.create({ email, passwordHash });
  console.log(`Default admin user created for email: ${email}`);
};

module.exports = { connectDB, SensorData, WeightMotionData, AdminUser, ensureAdminUser };