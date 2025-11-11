const mongoose = require('mongoose');

const hotelSchema = new mongoose.Schema({
  hotelId: { type: String, unique: true, required: true },
  name: String,
  location: String,
  roomsAvailable: Number,
});

module.exports = mongoose.model('Hotel', hotelSchema);