const express = require('express');
const router = express.Router();
const ratingController = require('../controllers/ratingController');

// Health check
router.get('/health', ratingController.getHealth);

// Rating routes
router.get('/', ratingController.getAllRatings);
router.post('/', ratingController.createRating);

// The FLAKY endpoint. Note how we chain the chaosMiddleware
router.get(
  '/user/:userId',
  ratingController.chaosMiddleware,
  ratingController.getUserRatings
);

module.exports = router;