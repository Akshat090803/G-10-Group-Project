const mongoose = require('mongoose');
const Rating = require('../models/ratingModel');

const MONGO_URL = 'mongodb://localhost:27017/rating_service_db';

const connectDB = async () => {
  try {
    await mongoose.connect(MONGO_URL);
    console.log('[Rating DB] Local MongoDB connected 🎉.');

    const count = await Rating.countDocuments();
    if (count === 0) {
      await Rating.create([
        { userId: 1, hotelId: 'hotel-123', stars: 5, comment: 'Amazing!' },
        { userId: 1, hotelId: 'hotel-456', stars: 4, comment: 'Very good.' },
      ]);
      console.log('[Rating DB] Dummy data seeded 🚀.');
    }

  } catch (err) {
    console.error('[Rating DB] Local MongoDB connection error (is it running?):', err);
    process.exit(1);
  }
};

module.exports = { connectDB };