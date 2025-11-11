const express = require('express');
const { connectDB } = require('./config/db');
const ratingRoutes = require('./routes/ratingRoutes');

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3003;

// Connect to MongoDB
connectDB();

// Load routes
app.use('/ratings', ratingRoutes);

app.listen(PORT, () => {
  console.log(`[Rating Service] Running on http://localhost:${PORT}`);
});