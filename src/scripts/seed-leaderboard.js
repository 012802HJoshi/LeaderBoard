import { configDotenv } from "dotenv";
import mongoose from "mongoose";
import connectDB from "../Config/connectDB.js";
import connectRedis, { getRedisClient } from "../Config/connectRedis.js";
import GameProfile from "../Model/game_profile.model.js";
import { upsertScore, getTotalPlayers, getTopPlayers } from "../Services/leaderboard.service.js";

import fs from "fs";

if (fs.existsSync(".env")) {
  configDotenv({ path: ".env" });
}
configDotenv({ path: process.env.NODE_ENV === "production" ? ".env" : ".env.development" });

const mongo_url = process.env.MONGODB_URL || "mongodb://localhost:27017/leaderboard";
const redis_url = process.env.REDIS_URL || "redis://localhost:6379";

async function seedLeaderboard() {
  try {
    console.log("Connecting to MongoDB and Redis...");
    await connectDB(mongo_url);
    await connectRedis(redis_url);

    const count = parseInt(process.argv[2] || process.env.SEED_COUNT || "200", 10);
    console.log(`Seeding ${count} users...`);

    const profilesToCreate = [];
    for (let i = 1; i <= count; i++) {
      // Generate levels between 10 and 1000
      const levelsPlayed = Math.floor(Math.random() * 990) + 10;
      profilesToCreate.push({
        username: `Player_${String(i).padStart(3, '0')}`,
        levelsPlayed,
        profileData: JSON.stringify({ avatar: `avatar_${(i % 10) + 1}.png`, country: "US" }),
      });
    }

    const BATCH_SIZE = 25;
    let totalCreated = 0;

    console.log("Inserting profiles into MongoDB and Redis in batches...");
    for (let i = 0; i < profilesToCreate.length; i += BATCH_SIZE) {
      const batch = profilesToCreate.slice(i, i + BATCH_SIZE);
      const createdBatch = await GameProfile.insertMany(batch, { ordered: false });
      totalCreated += createdBatch.length;

      for (const profile of createdBatch) {
        await upsertScore(profile._id.toString(), profile.levelsPlayed, profile.updatedAt);
      }
      console.log(`Processed ${totalCreated}/${count} profiles...`);
    }

    const total = await getTotalPlayers();
    console.log(`Total players in Redis sorted set: ${total}`);

    // Fetch and display top 10 raw entries from Redis
    const topEntries = await getTopPlayers(10);
    console.log("\nTop 10 raw Redis entries:");
    console.dir(topEntries, { depth: null });

    const redis = getRedisClient();
    await redis.quit();
    await mongoose.disconnect();

    console.log("\nSeeding completed successfully!");
    process.exit(0);
  } catch (error) {
    console.error("Error seeding leaderboard:", error);
    process.exit(1);
  }
}

seedLeaderboard();
