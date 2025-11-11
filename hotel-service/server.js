const express = require('express');
const { connectDB } = require('./config/db');
const { startConsumer } = require('./config/message-consumer');
const hotelRoutes = require('./routes/hotelRoutes');

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3002;

// Connect to local MongoDB
connectDB();

// Load routes
app.use('/hotels', hotelRoutes);

app.listen(PORT, () => {
  console.log(`[Hotel Service] Running on http://localhost:${PORT}`);
  
  // Start the message consumer *after* server is up
  startConsumer();
});