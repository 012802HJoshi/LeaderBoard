import express from "express";
import cors from "cors";
import { configDotenv } from "dotenv";
import client from "prom-client";
import connectDB from "./Config/connectDB.js";
import connectRedis from "./Config/connectRedis.js";
import cookieParser from "cookie-parser";
import { gameRouter } from "./Router/game.router.js";

configDotenv({ path: (process.env.NODE_ENV === "production" ? ".env" : ".env.development") });

const port = process.env.PORT;
const mongo_url = process.env.MONGODB_URL;
const redis_url = process.env.REDIS_URL || "redis://localhost:6379";

client.collectDefaultMetrics({ prefix: 'nodejs_' });

const application = express();

application.use(cors({
  origin: "https://localhost:5173",
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true
}));
application.use(express.json());
application.use(cookieParser());

application.use("/holeking", gameRouter);

application.get('/metrics', async (req, res) => {
  try {
    res.set('Content-Type', client.register.contentType);
    res.end(await client.register.metrics());
  } catch (err) {
    res.status(500).end(err.message);
  }
});

application.get("/", (req, res) => {
  res.send("Game LeaderBoard by ExpressJs Stagging v0.0.2");
})

async function startServer() {
  try {
    await connectDB(mongo_url);
    await connectRedis(redis_url);

    application.listen(port, () => {
      console.log(`[Server]: Running application at http://localhost:${port}`);
    });
  } catch (error) {
    console.error('[Server]: Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
