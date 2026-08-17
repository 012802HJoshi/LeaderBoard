import { configDotenv } from "dotenv";
configDotenv({ path: (process.env.NODE_ENV === "production" ? ".env" : ".env.development") });

import express from "express";
import cors from "cors";
import client from "prom-client";
import cookieParser from "cookie-parser";
import connectDB from "./Config/connectDB.js";
import { gameRouter } from "./Router/game.router.js";
import logger from "./Utils/logger.js";
import { errorHandler } from "./Middleware/error.middleware.js";

process.on("uncaughtException", (err) => {
  logger.error(`Uncaught Exception: ${err.message}`, { stack: err.stack });
});

process.on("unhandledRejection", (reason) => {
  const message = reason instanceof Error ? reason.message : String(reason);
  const stack = reason instanceof Error ? reason.stack : undefined;
  logger.error(`Unhandled Rejection: ${message}`, { stack });
});

const port = process.env.PORT;
const mongo_url = process.env.MONGODB_URL;

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
  res.send("Game LeaderBoard by ExpressJs Production v0.0.2");
});

// Central Express Error Handler
application.use(errorHandler);

application.listen(port, () => {
  connectDB(mongo_url);
  logger.info(`[Server]: Running application at http://localhost:${port} Production v0.0.2 Logger`);
});


