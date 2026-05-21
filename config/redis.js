const Redis = require('ioredis');

// Connect via the monolithic URL string if present (Render), otherwise fall back to host object settings
const redis = process.env.REDIS_URL 
    ? new Redis(process.env.REDIS_URL, { maxRetriesPerRequest: null }) 
    : new Redis({
        host: process.env.REDIS_HOST || '127.0.0.1',
        port: process.env.REDIS_PORT || 6379,
        password: process.env.REDIS_PASSWORD || null,
        maxRetriesPerRequest: null,
        retryStrategy(times) {
            return Math.min(times * 50, 2000);
        }
    });

// Event Monitoring Listeners
redis.on('connect', () => {
    console.log('✅ Redis client successfully connected to the cluster!');
});

redis.on('error', (err) => {
    console.error('❌ Redis operational connection fault encountered:', err.message || err);
});

module.exports = redis;