const Redis = require('ioredis');

// Use environment variables for production security
const redisConfig = {
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD || null,
    retryStrategy(times) {
        // Retry connection after a delay, maxing out at 2 seconds
        const delay = Math.min(times * 50, 2000);
        return delay;
    },
    maxRetriesPerRequest: null // Essential for long-lived processes
};

const redis = new Redis(redisConfig);

// Event Listeners for Monitoring
redis.on('connect', () => {
    console.log('✅ Redis client connected');
});

redis.on('error', (err) => {
    console.error('❌ Redis connection error:', err);
});

module.exports = redis;