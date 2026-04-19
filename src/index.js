import express from "express";
import cors from "cors";
import { configDotenv } from "dotenv";
import client from "prom-client";
import connectDB from "./Config/connectDB.js";
import cookieParser from "cookie-parser";
// import { router as auth } from "./Router/auth.router.js";
import { gameRouter } from "./Router/game.router.js";

configDotenv({path:(process.env.NODE_ENV ==="production" ? ".env":".env.development")});

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

// application.use('/auth',auth);
application.use("/game", gameRouter);

application.get('/metrics', async (req, res) => {
  try {
    res.set('Content-Type', client.register.contentType);
    res.end(await client.register.metrics());
  } catch (err) {
    res.status(500).end(err.message);
  }
});

application.get("/",(req,res)=>{
    res.send("Game LeaderBoard by ExpressJs Production");
})

application.listen(port,()=>{
    console.log(`[Server]: Running application at http://localhost:${port}`);
    connectDB(mongo_url);
})

