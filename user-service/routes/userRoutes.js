// const express = require('express');
// const router = express.Router();
// const userController = require('../controllers/userController');

// // Health check
// router.get('/health', userController.getHealth);

// // Circuit breaker state
// router.get('/breaker-state', userController.getBreakerState);

// // User routes
// router.get('/', userController.getAllUsers);
// router.post('/', userController.createUser);
// router.get('/:id', userController.getUserById);

// // Combined details route (calls rating-service)
// router.get('/:id/details', userController.getUserDetails);

// // Async booking route (sends to queue)
// router.post('/:id/book-hotel', userController.bookHotel);

// module.exports = router;

const express = require('express');
const userController = require('../controllers/userController');
const authController = require('../controllers/authController');
const requireAuth = require('../middlewares/requireAuth'); 

const router = express.Router();

// ==========================================
// PUBLIC ROUTES (No authentication required)
// ==========================================
router.get('/health', userController.getHealth);
router.get('/breaker-state', userController.getBreakerState); 

// Standard Auth
router.post('/auth/register', authController.register);
router.post('/auth/login', authController.login);
router.post('/auth/2fa/login', authController.verify2FALogin);

// Google OAuth
router.get('/auth/google', authController.googleAuthRedirect);
router.get('/auth/google/callback', authController.googleAuthCallback);



// 2FA Setup (Must be logged in to configure 2FA)
router.post('/auth/2fa/setup', requireAuth, authController.setup2FA);
router.post('/auth/2fa/verify-setup', requireAuth, authController.verify2FASetup);

// User Data & Actions
router.get('/', requireAuth, userController.getAllUsers); 
router.get('/:id', requireAuth, userController.getUserById);
router.get('/:id/details', requireAuth, userController.getUserDetails);

// Booking Action
router.post('/:id/book', requireAuth, userController.bookHotel);

module.exports = router;