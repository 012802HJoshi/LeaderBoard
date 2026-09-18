import Redis from "ioredis";

let redisClient = null;

function connectRedis(redisUrl) {
    return new Promise((resolve, reject) => {
        redisClient = new Redis(redisUrl, {
            maxRetriesPerRequest: 3,
            retryStrategy(times) {
                const delay = Math.min(times * 200, 5000);
                return delay;
            },
        });

        redisClient.on("connect", () => {
            console.log("[Redis]: Redis connected...");
            resolve(redisClient);
        });

        redisClient.on("error", (err) => {
            console.error("[Redis]: Connection error:", err.message);
        });
    });
}

export function getRedisClient() {
    if (!redisClient) {
        throw new Error("[Redis]: Redis client not initialized. Call connectRedis() first.");
    }
    return redisClient;
}

export default connectRedis;
