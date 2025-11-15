const axios = require('axios');
const Opossum = require('opossum');
const userModel = require('../models/userModel');
const mq = require('../config/message-queue');

// --- Circuit Breaker Setup ---
const fetchRatings = async (userId) => {
  console.log(`[User Service] Attempting to fetch ratings for user ${userId}`);
  // Use a hardcoded rating service URL. In production, this would be from service discovery.
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
  return { error: "Rating service is unavailable. Please try again later.", data: [] };
});
breaker.on('open', () => console.log(`[User Service] Circuit OPEN. Stopping requests to Rating Service.`));
breaker.on('halfOpen', () => console.log(`[User Service] Circuit HALF_OPEN. Trying one request...`));
breaker.on('close', () => console.log(`[User Service] Circuit CLOSED. Reset and working.`));

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
  const { name, email } = req.body;
  if (!name || !email) {
    return res.status(400).send('User name and email are required.');
  }
  try {
    const newUser = await userModel.create(name, email);
    console.log(`[User Service] Created new user with ID ${newUser.id}`);
    res.status(201).json(newUser);
  } catch (err) {
    // Check for PostgreSQL unique constraint violation
    if (err.code === '23505') {
      console.warn(`[User Service] Validation failed: Duplicate email ${email}`);
      return res.status(400).send(`Error: Email '${email}' is already in use.`);
    }
    console.error('[User Service] Error creating user:', err);
    res.status(500).send('Error creating user');
  }
};

const getUserDetails = async (req, res) => {
  const { id } = req.params;
  try {
    // 1. Get User
    const user = await userModel.findById(id);
    if (!user) {
      return res.status(404).send('User not found');
    }

    // 2. Get Ratings (via Circuit Breaker)
    const ratings = await breaker.fire(id);
    
    console.log(`[User Service] Successfully fetched details for user ${id}`);
    res.json({ user, ratings });

  } catch (err) {
    console.error(`[User Service] Error fetching details: ${err.message}`);
    
    if (err.message.includes('CircuitBreaker')) {
      const user = await userModel.findById(id);
      res.json({
        user,
        ratings: { error: "Rating service is unavailable. Please try again later.", data: [] }
      });
    } else {
      res.status(500).send('Error fetching user details');
    }
  }
};

const bookHotel = (req, res) => {
  const { id } = req.params;
  const { hotelId, days } = req.body;
  
  if (!hotelId || !days) {
    return res.status(400).send('hotelId and days are required.');
  }

  const bookingDetails = {
    userId: parseInt(id),
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
