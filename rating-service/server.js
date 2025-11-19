const express = require('express');
const { connectDB } = require('./config/db');
const ratingRoutes = require('./routes/ratingRoutes');

// --- IMPROVEMENT ---
const responseTime = require('response-time');
// const RollingStats = require('rolling-stats');
const RollingWindow = require('./utils/RollingWindow');

// Track stats for the last 60 seconds
// const stats = new RollingStats(60000); 
const stats = new RollingWindow(60000);
// --- END IMPROVEMENT ---

const app = express();
app.use(express.json());

// --- IMPROVEMENT ---
// Add response-time middleware
// This will be called for *all* routes, including our /health checks
app.use(responseTime((req, res, time) => {
  // Push the response time (in ms) into our stats collector
  stats.record(time);
}));

// Middleware to inject stats into the request object
app.use((req, res, next) => {
  req.stats = stats;
  next();
});
// --- END IMPROVEMENT ---

const PORT = process.env.PORT || 3003;

// Connect to MongoDB
connectDB();

// Load routes
app.use('/ratings', ratingRoutes);

app.listen(PORT, () => {
  console.log(` Running on http://localhost:${PORT}`);
});