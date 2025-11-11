const mongoose = require('mongoose');

const MONGO_URL = 'mongodb://localhost:27017/hotel_service_db';

const connectDB = async () => {
  try {
    await mongoose.connect(MONGO_URL);
    console.log('[Hotel DB] Local MongoDB connected.');
  } catch (err) {
    console.error('[Hotel DB] Local MongoDB connection error (is it running?):', err);
    process.exit(1);
  }
};

module.exports = { connectDB };