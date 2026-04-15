import express from "express";
import cors from "cors";
import { configDotenv } from "dotenv";
import connectDB from "./Config/connectDB.js";
import cookieParser from "cookie-parser";
// import { router as auth } from "./Router/auth.router.js";
import { gameRouter } from "./Router/game.router.js";

configDotenv({path:(process.env.NODE_ENV ==="production" ? ".env":".env.development")});

const port = process.env.PORT;
const mongo_url = process.env.MONGODB_URL;


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

application.get("/",(req,res)=>{
    res.send("Game LeaderBoard by ExpressJs");
})

application.listen(port,()=>{
    console.log(`[Server]: Running application at http://localhost:${port}`);
    connectDB(mongo_url);
})

