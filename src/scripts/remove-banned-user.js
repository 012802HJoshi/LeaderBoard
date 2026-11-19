import { configDotenv } from "dotenv";
import connectRedis, { getRedisClient } from "../Config/connectRedis.js";
import { BANNED_MONTHLY_LEADERBOARD_PROFILE_IDS } from "../Constants/game.constants.js";
import fs from "fs";

if (fs.existsSync(".env")) {
  configDotenv({ path: ".env" });
}
configDotenv({ path: process.env.NODE_ENV === "production" ? ".env" : ".env.development" });

const redis_url = process.env.REDIS_URL || "redis://localhost:6379";

const targetProfileId = process.argv[2] || "6acf2026a801bd3ff20a8bc8";

async function removeBanned() {
  try {
    console.log(`Connecting to Redis at ${redis_url}...`);
    await connectRedis(redis_url);
    const redis = getRedisClient();

    const idsToRemove = targetProfileId ? [targetProfileId] : Array.from(BANNED_MONTHLY_LEADERBOARD_PROFILE_IDS);

    console.log(`Removing banned profile ID(s) from monthly leaderboard:`, idsToRemove);

    for (const id of idsToRemove) {
      // Remove ONLY from monthly leaderboard
      const monthlyRemoved = await redis.zrem("leaderboard:monthly", id);
      console.log(`Profile ${id}: removed from monthly = ${monthlyRemoved}`);
    }

    // Invalidate monthly top-50 cache
    await redis.del("leaderboard:monthly:top50:cache");
    console.log("Invalidated monthly top-50 Redis cache.");

    await redis.quit();
    console.log("Done!");
    process.exit(0);
  } catch (error) {
    console.error("Error removing banned user from monthly leaderboard:", error);
    process.exit(1);
  }
}

removeBanned();
