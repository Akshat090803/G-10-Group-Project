const express = require('express');
const proxy = require('express-http-proxy');
const morgan = require('morgan');

const app = express();
app.use(morgan('dev'));


const userServiceUrl = 'http://localhost:3001';
const hotelServiceUrl = 'http://localhost:3002';

// Load Balancing for Rating Service  : we are using round robin
const ratingServiceInstances = [
  'http://localhost:3003',
  'http://localhost:3004',
];

let currentInstance = 0;
const getNextRatingInstance = () => {
  const instance = ratingServiceInstances[currentInstance];
  currentInstance = (currentInstance + 1) % ratingServiceInstances.length;
  return instance;
};

// --- Proxy Routes ---
app.use('/users', proxy(userServiceUrl, {
  proxyReqPathResolver: (req) => `/users${req.url}`
}));

app.use('/hotels', proxy(hotelServiceUrl, {
  proxyReqPathResolver: (req) => `/hotels${req.url}`
}));


app.use('/ratings', proxy(
  (req) => {
    // 1. Get the target instance for this request
    const targetInstance = getNextRatingInstance();

    console.log(`[API Gateway] Routing ${req.method} ${req.path} to ${targetInstance}`);

    return targetInstance;
  },
  {
    proxyReqPathResolver: (req) => {
      const path = `/ratings${req.url}`;
      return path;
    }
  }
));

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`[API Gateway] Running on http://localhost:${PORT}`);
});