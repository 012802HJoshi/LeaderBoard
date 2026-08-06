import { configDotenv } from "dotenv";
import mongoose from "mongoose";
import connectDB from "../Config/connectDB.js";
import connectRedis, { getRedisClient } from "../Config/connectRedis.js";
import GameProfile from "../Model/game_profile.model.js";
import { upsertScore, getTotalPlayers, getTopPlayers } from "../Services/leaderboard.service.js";
import { incrementMonthlyScore, getMonthlyTotalPlayers, getMonthlyTopPlayers, clearMonthlyLeaderboardData } from "../Services/monthly_leaderboard.service.js";
import fs from "fs";

if (fs.existsSync(".env")) {
  configDotenv({ path: ".env" });
}
configDotenv({ path: process.env.NODE_ENV === "production" ? ".env" : ".env.development" });

const mongo_url = (process.env.MONGODB_URL || "mongodb://localhost:27017/leaderboard").trim();
const redis_url = (process.env.REDIS_URL || "redis://localhost:6379").trim();

async function seedLeaderboard() {
  try {
    console.log("Connecting to MongoDB and Redis...");
    await connectDB(mongo_url);
    await connectRedis(redis_url);

    const redis = getRedisClient();

    const count = parseInt(process.argv[2] || process.env.SEED_COUNT || "200", 10);
    console.log(`Clearing existing profiles in MongoDB and Redis leaderboard keys...`);

    await GameProfile.deleteMany({});
    await redis.del("leaderboard:levels");
    await redis.del("leaderboard:top50:cache");
    await clearMonthlyLeaderboardData();

    console.log(`Seeding ${count} fresh users...`);

    const profilesToCreate = [];
    for (let i = 1; i <= count; i++) {
      // Generate levels between 10 and 1000
      const levelsPlayed = Math.floor(Math.random() * 990) + 10;
      profilesToCreate.push({
        username: `Player_${String(i).padStart(3, '0')}`,
        levelsPlayed,
        profileData: JSON.stringify({
          coins: Math.floor(Math.random() * 50000) + 10000,
          selectedAvatar: i % 5,
          selectedFrame: i % 3,
          totalFirstTryWins: Math.floor(Math.random() * 20) + 1,
          longestWinStreak: Math.floor(Math.random() * 10) + 1,
          totalThreeStarWins: Math.floor(Math.random() * 25) + 1,
          powerUps: {
            holeSize: Math.floor(Math.random() * 100),
            magnet: Math.floor(Math.random() * 50),
            compass: Math.floor(Math.random() * 50),
            freezeTime: Math.floor(Math.random() * 100),
            holeBooster: Math.floor(Math.random() * 50),
            addTime: Math.floor(Math.random() * 50),
          },
          unlockSkins: [18, 20],
        }),
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

        // Seed random monthly score between 50 and 5000
        const monthlyScore = Math.floor(Math.random() * 4950) + 50;
        await incrementMonthlyScore(profile._id.toString(), monthlyScore);
      }
      console.log(`Processed ${totalCreated}/${count} profiles...`);
    }

    const totalGlobal = await getTotalPlayers();
    const totalMonthly = await getMonthlyTotalPlayers();
    console.log(`Total players in Global Redis sorted set: ${totalGlobal}`);
    console.log(`Total players in Monthly Redis sorted set: ${totalMonthly}`);

    // Fetch and display top 10 raw entries from Redis
    const topGlobalEntries = await getTopPlayers(10);
    console.log("\nTop 10 raw Global Redis entries:");
    console.dir(topGlobalEntries, { depth: null });

    const topMonthlyEntries = await getMonthlyTopPlayers(10);
    console.log("\nTop 10 raw Monthly Redis entries:");
    console.dir(topMonthlyEntries, { depth: null });

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
