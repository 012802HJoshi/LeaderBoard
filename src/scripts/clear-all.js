import { configDotenv } from "dotenv";
import mongoose from "mongoose";
import connectDB from "../Config/connectDB.js";
import connectRedis, { getRedisClient } from "../Config/connectRedis.js";
import GameProfile from "../Model/game_profile.model.js";
import fs from "fs";

if (fs.existsSync(".env")) {
  configDotenv({ path: ".env" });
}
configDotenv({ path: process.env.NODE_ENV === "production" ? ".env" : ".env.development" });

const mongo_url = process.env.MONGODB_URL || "mongodb://localhost:27017/leaderboard";
const redis_url = process.env.REDIS_URL || "redis://localhost:6379";

async function clearAll() {
  try {
    console.log("Connecting to MongoDB and Redis...");
    await connectDB(mongo_url);
    await connectRedis(redis_url);

    const redis = getRedisClient();

    console.log("Deleting all GameProfile entries from MongoDB...");
    const deleteResult = await GameProfile.deleteMany({});
    console.log(`Deleted ${deleteResult.deletedCount} documents from MongoDB.`);

    console.log("Deleting leaderboard keys from Redis...");
    await redis.del("leaderboard:levels");
    await redis.del("leaderboard:top50:cache");
    await redis.del("leaderboard:monthly");
    await redis.del("leaderboard:monthly:top50:cache");
    console.log("Cleared Redis keys ('leaderboard:levels', 'leaderboard:top50:cache', 'leaderboard:monthly', 'leaderboard:monthly:top50:cache').");

    await redis.quit();
    await mongoose.disconnect();

    console.log("\nAll entries successfully deleted from MongoDB and Redis!");
    process.exit(0);
  } catch (error) {
    console.error("Error clearing database and Redis:", error);
    process.exit(1);
  }
}

clearAll();
