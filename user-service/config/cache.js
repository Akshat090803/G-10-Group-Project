const NodeCache = require('node-cache');

// stdTTL: 5 minutes (300 seconds). After 5 mins, the cache expires.
// checkperiod: 60 seconds. Auto-check for expired keys every minute.
const cache = new NodeCache({ stdTTL: 300, checkperiod: 60 });

console.log(' In-memory cache initialized.');

module.exports = cache;