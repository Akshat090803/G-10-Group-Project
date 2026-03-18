const express = require('express');
const userRoutes = require('./routes/userRoutes');
const cookieParser = require('cookie-parser');
require('./config/db'); // Initializes DB connection & tables
require('./config/message-queue'); // Initializes MQ connection
const cors = require('cors');
require('dotenv').config();
const app = express();
app.use(express.json());
app.use(cookieParser());
app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true 
}));

const PORT = process.env.PORT || 3001;

// Load the routes
app.use('/users', userRoutes);

app.listen(PORT, () => {
  console.log(`[User Service] Running on http://localhost:${PORT}`);
});