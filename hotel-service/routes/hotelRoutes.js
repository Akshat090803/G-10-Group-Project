const express = require('express');
const router = express.Router();
const hotelController = require('../controllers/hotelController');

// Health check
router.get('/health', hotelController.getHealth);

// Hotel routes
router.get('/', hotelController.getAllHotels);
router.post('/', hotelController.createHotel);

// Booking routes
router.get('/bookings', hotelController.getAllBookings);

module.exports = router;