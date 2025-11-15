const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  userId: Number, 
  hotelId: String,
  days: Number,
  timestamp: Date,
  status: { type: String, default: 'CONFIRMED' }
});

module.exports = mongoose.model('Booking', bookingSchema);