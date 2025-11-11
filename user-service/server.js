const express = require('express');
const userRoutes = require('./routes/userRoutes');
require('./config/db'); // Initializes DB connection & tables
require('./config/message-queue'); // Initializes MQ connection

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3001;

// Load the routes
app.use('/users', userRoutes);

app.listen(PORT, () => {
  console.log(`[User Service] Running on http://localhost:${PORT}`);
});