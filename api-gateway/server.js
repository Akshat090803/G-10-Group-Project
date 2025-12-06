// const express = require('express');
// const proxy = require('express-http-proxy');
// const morgan = require('morgan');

// const app = express();
// app.use(morgan('dev'));


// const userServiceUrl = 'http://localhost:3001';
// const hotelServiceUrl = 'http://localhost:3002';

// // Load Balancing for Rating Service  : we are using round robin
// const ratingServiceInstances = [
//   'http://localhost:3003',
//   'http://localhost:3004',
// ];

// let currentInstance = 0;
// const getNextRatingInstance = () => {
//   const instance = ratingServiceInstances[currentInstance];
//   currentInstance = (currentInstance + 1) % ratingServiceInstances.length;
//   return instance;
// };

// // --- Proxy Routes ---
// app.use('/users', proxy(userServiceUrl, {
//   proxyReqPathResolver: (req) => `/users${req.url}`
// }));

// app.use('/hotels', proxy(hotelServiceUrl, {
//   proxyReqPathResolver: (req) => `/hotels${req.url}`
// }));


// app.use('/ratings', proxy(
//   (req) => {
//     // 1. Get the target instance for this request
//     const targetInstance = getNextRatingInstance();

//     console.log(`[API Gateway] Routing ${req.method} ${req.path} to ${targetInstance}`);

//     return targetInstance;
//   },
//   {
//     proxyReqPathResolver: (req) => {
//       const path = `/ratings${req.url}`;
//       return path;
//     }
//   }
// ));

// const PORT = 3000;
// app.listen(PORT, () => {
//   console.log(`[API Gateway] Running on http://localhost:${PORT}`);
// });

// !-------------
// const express = require('express');
// const proxy = require('express-http-proxy');
// const morgan = require('morgan');
// const axios = require('axios');

// const app = express();
// app.use(morgan('dev'));

// // --- Proxy Routes for User and Hotel ---
// const userServiceUrl = 'http://localhost:3001';
// const hotelServiceUrl = 'http://localhost:3002';

// app.use('/users', proxy(userServiceUrl, {
//   proxyReqPathResolver: (req) => `/users${req.url}`
// }));

// app.use('/hotels', proxy(hotelServiceUrl, {
//   proxyReqPathResolver: (req) => `/hotels${req.url}`
// }));

// // --- ADAPTIVE WEIGHTED LOAD BALANCING ---
// // Initial instance state
// const ratingServiceInstances = [
//   {
//     url: 'http://localhost:3003',
//     status: 'UP',
//     avgResponseTime: 100,
//     weight: 1 / (100 + 1)
//   },
//   {
//     url: 'http://localhost:3004',
//     status: 'UP',
//     avgResponseTime: 100,
//     weight: 1 / (100 + 1)
//   }
// ];

// // --- Health check every 5 seconds ---
// const HEALTH_CHECK_INTERVAL = 5000;

// const healthCheckPoller = async () => {
//   console.log('[API Gateway] Running health checks...');

//   for (const instance of ratingServiceInstances) {
//     try {
//       const response = await axios.get(`${instance.url}/ratings/health`, { timeout: 1000 });

//       if (response.data && response.data.status === 'UP') {
//         instance.status = 'UP';
//         instance.avgResponseTime = response.data.avgResponseTime;

//         // Weight = 1 / (latency + 1)
//         instance.weight = 1 / (instance.avgResponseTime + 1);

//         console.log(`[API Gateway] Health OK: ${instance.url} | Avg: ${instance.avgResponseTime}ms | Weight: ${instance.weight}`);
//       } else {
//         throw new Error('Unhealthy');
//       }
//     } catch (err) {
//       instance.status = 'DOWN';
//       instance.weight = 0;

//       console.error(`[API Gateway] Health FAILED: ${instance.url} → Marked DOWN`);
//     }
//   }
// };

// setInterval(healthCheckPoller, HEALTH_CHECK_INTERVAL);
// healthCheckPoller(); // run immediately on startup

// // --- Weighted random selection ---
// const selectWeightedRatingInstance = () => {
//   const available = ratingServiceInstances.filter(i => i.status === 'UP');

//   if (available.length === 0) {
//     console.error("[API Gateway] No healthy rating services!");
//     return null;
//   }

//   const totalWeight = available.reduce((sum, inst) => sum + inst.weight, 0);

//   if (totalWeight === 0) {
//     return available[Math.floor(Math.random() * available.length)];
//   }

//   let random = Math.random() * totalWeight;

//   for (const inst of available) {
//     random -= inst.weight;
//     if (random <= 0) return inst;
//   }

//   return available[available.length - 1];
// };

// // --- Proxy /ratings using adaptive load balancer ---
// app.use('/ratings', proxy(
//   (req) => {
//     const instance = selectWeightedRatingInstance();

//     if (!instance) return 'http://localhost:9999'; // force failure

//     console.log(`[API Gateway] Routing ${req.method} ${req.path} → ${instance.url} (Weight=${instance.weight.toFixed(5)})`);

//     return instance.url;
//   },
//   {
//     proxyReqPathResolver: (req) => `/ratings${req.url}`
//   }
// ));

// const PORT = 3000;
// app.listen(PORT, () => {
//   console.log(`[API Gateway] Running on http://localhost:${PORT}`);
// });

//?-------
// const express = require('express');
// const proxy = require('express-http-proxy');
// const morgan = require('morgan');
// const axios = require('axios');

// const app = express();
// app.use(morgan('dev'));

// // --------------------------------------------------
// // USER + HOTEL SERVICES (UNCHANGED)
// // --------------------------------------------------
// const userServiceUrl = 'http://localhost:3001';
// const hotelServiceUrl = 'http://localhost:3002';

// app.use('/users', proxy(userServiceUrl, {
//   proxyReqPathResolver: (req) => `/users${req.url}`
// }));

// app.use('/hotels', proxy(hotelServiceUrl, {
//   proxyReqPathResolver: (req) => `/hotels${req.url}`
// }));

// // --------------------------------------------------
// // RATING SERVICES – FIXED
// // --------------------------------------------------

// // 1. FIX: Proper initialization
// const ratingServiceInstances = [
//   { url: 'http://localhost:3003', status: 'DOWN', avgResponseTime: 0, weight: 1 },
//   { url: 'http://localhost:3004', status: 'DOWN', avgResponseTime: 0, weight: 1 },
//   { url: 'http://localhost:3005', status: 'DOWN', avgResponseTime: 0, weight: 1 }
// ];

// // 2. Health checker
// const HEALTH_CHECK_INTERVAL = 5000;

// const healthCheckPoller = async () => {
//   console.log('\n[API Gateway] Running health checks...');

//   for (const inst of ratingServiceInstances) {
//     try {
//       const res = await axios.get(`${inst.url}/ratings/health`, { timeout: 1200 });

//       if (res.data?.status === 'UP') {
//         inst.status = 'UP';
//         inst.avgResponseTime = res.data.avgResponseTime;

//         // Weight based on speed
//         inst.weight = 1 / (inst.avgResponseTime + 1);

//         console.log(
//           `[OK] ${inst.url} | Avg: ${inst.avgResponseTime}ms | Weight: ${inst.weight.toFixed(5)}`
//         );
//       } else {
//         throw new Error('Unhealthy');
//       }

//     } catch (err) {
//       inst.status = 'DOWN';
//       inst.weight = 0;
//       console.log(`[DOWN] ${inst.url} | Marked DOWN`);
//     }
//   }
// };

// setInterval(healthCheckPoller, HEALTH_CHECK_INTERVAL);
// healthCheckPoller();

// // --------------------------------------------------
// // WEIGHTED RANDOM (FIXED LOGGING)
// // --------------------------------------------------
// const selectWeightedRatingInstance = () => {
//   const upInstances = ratingServiceInstances.filter(i => i.status === 'UP');

//   if (upInstances.length === 0) return null;

//   const totalWeight = upInstances.reduce((sum, i) => sum + i.weight, 0);

//   let random = Math.random() * totalWeight;

//   for (const inst of upInstances) {
//     random -= inst.weight;
//     if (random <= 0) {
//       console.log(
//         `[API Gateway] Selected instance → ${inst.url} | Weight: ${inst.weight.toFixed(5)}`
//       );
//       return inst;
//     }
//   }

//   return upInstances[upInstances.length - 1];
// };

// // --------------------------------------------------
// // PROXY ROUTE FOR /ratings (FIXED)
// // --------------------------------------------------
// app.use('/ratings', proxy(
//   (req) => {
//     const inst = selectWeightedRatingInstance();

//     if (!inst) {
//       console.error("[API Gateway] No rating instance is UP!");
//       return "http://localhost:9999"; // force fail
//     }

//     console.log(
//       `[ROUTING] ${req.method} ${req.url} --> ${inst.url}/ratings${req.url}`
//     );

//     return inst.url;
//   },
//   {
//     proxyReqPathResolver: (req) => `/ratings${req.url}`
//   }
// ));

// // --------------------------------------------------
// const PORT = 3000;
// app.listen(PORT, () => {
//   console.log(`[API Gateway] Running at http://localhost:${PORT}`);
// });


// !--------
//?------imorved colors for more better gui

const express = require('express');
const proxy = require('express-http-proxy');
const morgan = require('morgan');
const axios = require('axios');
const chalk = require('chalk');

const app = express();
app.use(morgan('dev'));

// --------------------------------------------------
// USER + HOTEL SERVICES
// --------------------------------------------------
const userServiceUrl = 'http://localhost:3001';
const hotelServiceUrl = 'http://localhost:3002';

app.use('/users', proxy(userServiceUrl, {
  proxyReqPathResolver: req => `/users${req.url}`
}));

app.use('/hotels', proxy(hotelServiceUrl, {
  proxyReqPathResolver: req => `/hotels${req.url}`
}));

// --------------------------------------------------
// RATING SERVICES
// --------------------------------------------------
const ratingServiceInstances = [
  { url: 'http://localhost:3003', status: 'DOWN', avgResponseTime: 0, weight: 1 },
  { url: 'http://localhost:3004', status: 'DOWN', avgResponseTime: 0, weight: 1 },
  { url: 'http://localhost:3005', status: 'DOWN', avgResponseTime: 0, weight: 1 }
];

const HEALTH_CHECK_INTERVAL = 1000;

// --------------------------------------------------
// HEALTH CHECK POLLER  (with colors)
// --------------------------------------------------
const healthCheckPoller = async () => {
  console.log(chalk.magenta.bold('\n[API Gateway] Running health checks...'));

  for (const inst of ratingServiceInstances) {
    try {
      const res = await axios.get(`${inst.url}/ratings/health`, { timeout: 1200 });

      if (res.data?.status === 'UP') {
        inst.status = 'UP';
        inst.avgResponseTime = res.data.avgResponseTime;
        inst.weight = 1 / (inst.avgResponseTime + 1);

        console.log(
          chalk.green(`[UP] ${inst.url}`) + 
          chalk.white(` | Avg: ${inst.avgResponseTime}ms | Weight: ${inst.weight.toFixed(5)}`)
        );

      } else {
        throw new Error('Unhealthy');
      }

    } catch (err) {
      inst.status = 'DOWN';
      inst.weight = 0;

      console.log(
        chalk.red(`[DOWN] ${inst.url}`) + 
        chalk.gray(` | Marked DOWN`)
      );
    }
  }
};

setInterval(healthCheckPoller, HEALTH_CHECK_INTERVAL);
healthCheckPoller();

// --------------------------------------------------
// WEIGHTED INSTANCE SELECTION (with colors)
// --------------------------------------------------
// const selectWeightedRatingInstance = () => {
//   const upInstances = ratingServiceInstances.filter(i => i.status === 'UP');
//   if (upInstances.length === 0) return null;

//   const totalWeight = upInstances.reduce((sum, i) => sum + i.weight, 0);
//   let random = Math.random() * totalWeight;

//   for (const inst of upInstances) {
//     random -= inst.weight;
//     if (random <= 0) {
//       console.log(
//         chalk.cyan(`[SELECTED] ${inst.url}`) + 
//         chalk.white(` | Weight: ${inst.weight.toFixed(5)}`)
//       );
//       return inst;
//     }
//   }

//   return upInstances[upInstances.length - 1];
// };

const selectBestRatingInstance = () => {
  // Filter for only 'UP' instances
  const upInstances = ratingServiceInstances.filter(i => i.status === 'UP');

  if (upInstances.length === 0) return null;

  // Sort by weight descending (Highest weight = Lowest Response Time)
  // If weights are equal, it picks the first one (stable).
  upInstances.sort((a, b) => b.weight - a.weight);

  const bestInstance = upInstances[0];

  console.log(
    chalk.cyan(`[SELECTED] ${bestInstance.url}`) + 
    chalk.white(` | Best Weight: ${bestInstance.weight.toFixed(5)}`)
  );
  
  return bestInstance;
};
// --------------------------------------------------
// PROXY FOR /ratings (with colors)
// --------------------------------------------------
app.use(
  '/ratings',
  proxy(
    req => {
      // const inst = selectWeightedRatingInstance();
      const inst = selectBestRatingInstance();

      if (!inst) {
        console.log(chalk.redBright(`[ERROR] No rating service UP!`));
        return "http://localhost:9999"; 
      }

      console.log(
        chalk.yellow(`[ROUTE] ${req.method} ${req.url}`) +
        chalk.white(` --> `) +
        chalk.yellow(`${inst.url}/ratings${req.url}`)
      );

      return inst.url;
    },
    {
      proxyReqPathResolver: req => `/ratings${req.url}`,
    }
  )
);

// --------------------------------------------------
const PORT = 3000;
app.listen(PORT, () => {
  console.log(chalk.magenta.bold(`[API Gateway] Running at http://localhost:${PORT}`));
});
