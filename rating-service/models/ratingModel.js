const mongoose = require('mongoose');

const ratingSchema = new mongoose.Schema({
  userId: String,
  hotelId: String,
  stars: Number,
  comment: String,
});

module.exports = mongoose.model('Rating', ratingSchema);