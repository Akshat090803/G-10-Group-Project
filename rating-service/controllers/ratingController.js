const Rating = require('../models/ratingModel');

const PORT = process.env.PORT || 3003;

// --- CHAOS ENGINEERING (50% failure) ---
const chaosMiddleware = (req, res, next) => {
  if (Math.random() < 0.5) {
    console.log(` FAILED request (Chaos) for ${req.path}`);
    return res.status(500).send('Internal Server Error (Chaos)');
  }
  next();
};

// --- IMPROVEMENT ---
// The /health endpoint now reports its rolling-average response time
const getHealth = (req, res) => {
  const avgTime = req.stats.mean();
  res.status(200).send({ 
    status: 'UP',
    avgResponseTime: avgTime || 0 // Use 0 if no data yet
  });
};
// --- END IMPROVEMENT ---

const getAllRatings = async (req, res) => {
  console.log(` Received request for all ratings`);
  const ratings = await Rating.find();
  res.json(ratings);
};

const getUserRatings = async (req, res) => {

  // !delay for demonstration
  // if (PORT === 3004) {
  //   await new Promise(resolve => setTimeout(resolve, 300));
  // }
  const userId = parseInt(req.params.userId); 
  console.log(` SUCCESS request for user ${userId}`);
  const ratings = await Rating.find({ userId: userId });
  res.json(ratings);
};

const createRating = async (req, res) => {
  try {
    const newRating = new Rating(req.body);
    await newRating.save();
    console.log(` Created new rating`);
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