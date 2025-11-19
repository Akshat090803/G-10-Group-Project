const axios = require('axios');
const Opossum = require('opossum');
const userModel = require('../models/userModel');
const mq = require('../config/message-queue');
const cache = require('../config/cache'); // --- IMPROVEMENT --- Import the cache

// --- Circuit Breaker Setup ---

// The main function for the circuit breaker
const fetchRatings = async (userId) => {
  console.log(` ATTEMPTING LIVE FETCH for ratings for user ${userId}`);
  // Use a hardcoded rating service URL. In production, this would be from service discovery.
  const response = await axios.get(`http://localhost:3003/ratings/user/${userId}`);
  
  // --- IMPROVEMENT --- On success, update the cache with fresh data
  if (response.data) {
    const cacheKey = `ratings:${userId}`;
    cache.set(cacheKey, response.data);
    console.log(` CACHE SET for ${cacheKey}`);
  }
  // --- END IMPROVEMENT ---
  
  return response.data;
};

const options = {
  timeout: 3000,
  errorThresholdPercentage: 50,
  resetTimeout: 30000,
};
const breaker = new Opossum(fetchRatings, options);

// --- Health/State Logging ---

// --- IMPROVEMENT --- Modify the fallback to check the cache
breaker.fallback((userId) => {
  console.warn(` FALLBACK TRIGGERED for user ${userId}. Checking cache...`);
  const cacheKey = `ratings:${userId}`;
  const staleData = cache.get(cacheKey);

  if (staleData) {
    console.warn(` CACHE HIT (STALE). Returning stale data for ${cacheKey}.`);
    // Return the stale data, adding a flag so the client knows
    return {...staleData, stale: true }; 
  } else {
    console.error(` CACHE MISS. Rating service is down and no cache available for ${cacheKey}.`);
    return { error: "Rating service is unavailable and no cached data found.", data:null, stale: true };
  }
});
// --- END IMPROVEMENT ---

breaker.on('open', () => console.log(` Circuit OPEN. Stopping requests to Rating Service.`));
breaker.on('halfOpen', () => console.log(` Circuit HALF_OPEN. Trying one request...`));
breaker.on('close', () => console.log(` Circuit CLOSED. Reset and working.`));

// --- Controller Functions ---

const getHealth = (req, res) => res.status(200).send({ status: 'UP' });

const getBreakerState = (req, res) => {
  res.status(200).json({
    state: breaker.closed? 'CLOSED' : (breaker.opened? 'OPEN' : 'HALF_OPEN'),
    stats: breaker.stats,
  });
};

const getAllUsers = async (req, res) => {
  try {
    const users = await userModel.findAll();
    console.log(` Fetched all users`);
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
    console.log(` Fetched user ${req.params.id} from DB`);
    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).send('DB Error');
  }
};

const createUser = async (req, res) => {
  const { name, email } = req.body;
  if (!name ||!email) {
    return res.status(400).send('User name and email are required.');
  }
  try {
    const newUser = await userModel.create(name, email);
    console.log(` Created new user with ID ${newUser.id}`);
    res.status(201).json(newUser);
  } catch (err) {
    // Check for PostgreSQL unique constraint violation
    if (err.code === '23505') {
      console.warn(` Validation failed: Duplicate email ${email}`);
      return res.status(400).send(`Error: Email '${email}' is already in use.`);
    }
    console.error(' Error creating user:', err);
    res.status(500).send('Error creating user');
  }
};

const getUserDetails = async (req, res) => {
  const { id } = req.params;
  try {
    // 1. Get User (This part is unchanged)
    const user = await userModel.findById(id);
    if (!user) {
      return res.status(404).send('User not found');
    }

    // 2. Get Ratings (via Circuit Breaker)
    // This 'await' will now either return:
    //   a) Fresh data (if circuit is CLOSED and service is UP)
    //   b) Stale data (if circuit is OPEN and cache is WARM)
    //   c) Empty/error data (if circuit is OPEN and cache is COLD)
    const ratings = await breaker.fire(id);
    
    console.log(` Successfully fetched details for user ${id}`);
    res.json({ user, ratings });

  } catch (err) {
    // This block now primarily catches errors from breaker.fire() 
    // *only if the fallback itself fails*, or if userModel.findById fails.
    console.error(` Error fetching details: ${err.message}`);
    
    // --- IMPROVEMENT --- This logic is now mostly handled by the fallback
    // But we keep it as a final safety net.
    const user = await userModel.findById(id); // Try to get user data anyway
    res.json({
      user,
      ratings: { error: err.message, data:null, stale: true }
    });
    // --- END IMPROVEMENT ---
  }
};

const bookHotel = (req, res) => {
  const { id } = req.params;
  const { hotelId, days } = req.body;
  
  if (!hotelId ||!days) {
    return res.status(400).send('hotelId and days are required.');
  }

  const bookingDetails = {
    userId: parseInt(id),
    hotelId,
    days,
    timestamp: new Date(),
  };

  mq.sendMessage(bookingDetails);
  console.log(` Sent booking to queue for user ${id}`);
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