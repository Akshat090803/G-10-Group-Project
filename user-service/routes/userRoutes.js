const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');

// Health check
router.get('/health', userController.getHealth);

// Circuit breaker state
router.get('/breaker-state', userController.getBreakerState);

// User routes
router.get('/', userController.getAllUsers);
router.post('/', userController.createUser);
router.get('/:id', userController.getUserById);

// Combined details route (calls rating-service)
router.get('/:id/details', userController.getUserDetails);

// Async booking route (sends to queue)
router.post('/:id/book-hotel', userController.bookHotel);

module.exports = router;