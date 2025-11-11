const Rating = require('../models/ratingModel');

const PORT = process.env.PORT || 3003;

// --- CHAOS ENGINEERING (50% failure) ---
const chaosMiddleware = (req, res, next) => {
  if (Math.random() < 0.5) {
    console.log(`[Rating Service on ${PORT}] FAILED request (Chaos) for ${req.path}`);
    return res.status(500).send('Internal Server Error (Chaos)');
  }
  next();
};

const getHealth = (req, res) => res.status(200).send({ status: 'UP' });

const getAllRatings = async (req, res) => {
  console.log(`[Rating Service on ${PORT}] Received request for all ratings`);
  const ratings = await Rating.find();
  res.json(ratings);
};

const getUserRatings = async (req, res) => {
  console.log(`[Rating Service on ${PORT}] SUCCESS request for user ${req.params.userId}`);
  const ratings = await Rating.find({ userId: req.params.userId });
  res.json(ratings);
};

const createRating = async (req, res) => {
  try {
    const newRating = new Rating(req.body);
    await newRating.save();
    console.log(`[Rating Service on ${PORT}] Created new rating`);
    res.status(201).json(newRating);
  } catch (err) {
    res.status(400).send(err.message);
  }
};

module.exports = {
  chaosMiddleware,
  getHealth,
  getAllRatings,
  getUserRatings,
  createRating
};