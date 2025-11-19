const mongoose = require('mongoose');

const MONGO_URL = 'mongodb+srv://akshatjain70233_db_user:V6RHRqKbmH1p7EG6@hotelservice.ptqapgk.mongodb.net/?appName=hotelservice';

const connectDB = async () => {
  try {
    await mongoose.connect(MONGO_URL);
    console.log('[Hotel DB] Local MongoDB connected 🎉.');
  } catch (err) {
    console.error('[Hotel DB] Local MongoDB connection error (is it running?):', err);
    process.exit(1);
  }
};

module.exports = { connectDB };