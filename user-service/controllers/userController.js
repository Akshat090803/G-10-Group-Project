const axios = require('axios');
const Opossum = require('opossum');
const userModel = require('../models/userModel');
const mq = require('../config/message-queue');

// --- Circuit Breaker Setup ---
const fetchRatings = async (userId) => {
  console.log(`[User Service] Attempting to fetch ratings for user ${userId}`);
  const response = await axios.get(`http://localhost:3003/ratings/user/${userId}`);
  return response.data;
};

const options = {
  timeout: 3000, 
  errorThresholdPercentage: 50, 
  resetTimeout: 30000,
};
const breaker = new Opossum(fetchRatings, options);

// --- Health/State Logging ---
breaker.fallback((userId) => {
  console.warn(`[User Service] Fallback: Rating service is down. Returning fallback data for user ${userId}.`);
  return "Rating service is down, returning cached/fallback data.";
});
breaker.on('open', () => console.log(`[User Service] Circuit OPEN. Stopping requests to Rating Service.`));
breaker.on('halfOpen', () => console.log(`[User Service] Circuit HALF_OPEN. Trying one request...`));
breaker.on('close', () => console.log(`[User Service] Circuit CLOSED. Reset and working.`));
breaker.on('fallback', () => console.log(`[User Service] Circuit OPEN. Using fallback.`));

// --- Controller Functions ---

const getHealth = (req, res) => res.status(200).send({ status: 'UP' });

const getBreakerState = (req, res) => {
  res.status(200).json({
    state: breaker.closed ? 'CLOSED' : (breaker.opened ? 'OPEN' : 'HALF_OPEN'),
    stats: breaker.stats,
  });
};

const getAllUsers = async (req, res) => {
  try {
    const users = await userModel.findAll();
    console.log(`[User Service] Fetched all users`);
    res.json(users);
  } catch (err) {
    console.error(err);
    res.status(500).send('DB Error');
  }
};

const getUserById = async (req, res) => {
  try {
    const user = await userModel.findById(req.params.id);
    if (!user) {
      return res.status(404).send('User not found');
    }
    console.log(`[User Service] Fetched user ${req.params.id} from DB`);
    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).send('DB Error');
  }
};

const createUser = async (req, res) => {
  const { id, name } = req.body;
  if (!id || !name) {
    return res.status(400).send('User ID and Name are required.');
  }
  try {
    const newUser = await userModel.create(id, name);
    console.log(`[User Service] Created new user with ID ${id}`);
    res.status(201).json(newUser);
  } catch (err) {
    console.error(err);
    res.status(500).send('DB Error (maybe user ID already exists?)');
  }
};

const getUserDetails = async (req, res) => {
  const { id } = req.params;
  try {
    const user = await userModel.findById(id);
    if (!user) {
      return res.status(404).send('User not found');
    }
    const ratings = await breaker.fire(id);
    
    console.log(`[User Service] Successfully fetched details for user ${id}`);
    res.json({ user, ratings });

  } catch (err) {
    console.error(`[User Service] Error fetching details: ${err.message}`);
    // If the breaker is open, err will be "CircuitBreaker open".
    // Opossum's fallback handles the response, so this catch
    // primarily catches errors if the user *itself* isn't found
    // or if the breaker.fire() fails in a non-fallback way.
    if (err.message.includes('CircuitBreaker')) {
      // This case is handled by the fallback, but just in case:
      const ratings = "Rating service is down, returning cached/fallback data.";
      res.json({ user, ratings });
    } else {
      res.status(500).send('Error fetching user details');
    }
  }
};

const bookHotel = (req, res) => {
  const { id } = req.params;
  const { hotelId, days } = req.body;

  const bookingDetails = {
    userId: id,
    hotelId,
    days,
    timestamp: new Date(),
  };

  mq.sendMessage(bookingDetails);
  console.log(`[User Service] Sent booking to queue for user ${id}`);
  res.status(202).send({ message: 'Booking request received and is being processed.' });
};

module.exports = {
  getHealth,
  getBreakerState,
  getAllUsers,
  getUserById,
  createUser,
  getUserDetails,
  bookHotel
};