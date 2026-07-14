const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
require('dotenv').config();

const sensorSchema = new mongoose.Schema({
  cage:        { type: Number, required: true },
  temperature: { type: Number, required: true },
  humidity:    { type: Number, required: true },
  samples:     { type: Number },
  timestamp:   { type: Date, default: Date.now },
});

const SensorData = mongoose.model('SensorData', sensorSchema);

const weightMotionSchema = new mongoose.Schema({
  cage:      { type: Number, required: true },
  weight:    { type: Number, required: true },
  timestamp: { type: Date, default: Date.now },
});

const WeightMotionData = mongoose.model('WeightMotionData', weightMotionSchema);

const thresholdSettingsSchema = new mongoose.Schema({
  temperatureThresholdDown: { type: Number, default: 0 },
  temperatureThresholdUp:   { type: Number, default: 0 },
  weightThresholdGrams:     { type: Number, default: 0 },
  updatedAt:                { type: Date, default: Date.now },
});

const ThresholdSettings = mongoose.model('ThresholdSettings', thresholdSettingsSchema);

const controlStatusSchema = new mongoose.Schema({
  cage:      { type: Number, required: true },
  fan:       { type: Boolean, required: true },
  heater:    { type: Boolean, required: true },
  timestamp: { type: Date, default: Date.now },
});

const ControlStatus = mongoose.model('ControlStatus', controlStatusSchema);

// Admin user schema
const adminSchema = new mongoose.Schema({
  email: { type: String, unique: true, required: true },
  passwordHash: { type: String, required: true },
  role: { type: String, default: 'admin' },
  createdAt: { type: Date, default: Date.now },
});

const AdminUser = mongoose.model('AdminUser', adminSchema);

// Regular user schema (managed by admins)
const userSchema = new mongoose.Schema({
  email: { type: String, unique: true, required: true },
  passwordHash: { type: String, required: true },
  name: { type: String, default: '' },
  role: { type: String, default: 'user' },
  status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  createdAt: { type: Date, default: Date.now },
});

const User = mongoose.model('User', userSchema);

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

module.exports = { connectDB, SensorData, WeightMotionData, ThresholdSettings, ControlStatus, AdminUser, User, ensureAdminUser };