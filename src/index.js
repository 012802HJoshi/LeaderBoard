import express from "express";
import { configDotenv } from "dotenv";

import connectDB from "./Config/connectDB.js";

configDotenv({path:(process.env.NODE_ENV ==="production" ? ".env":".env.development")});
const port = process.env.PORT;
const mongo_url = process.env.MONGODB_URL;

const application = express();

application.get("/",(req,res)=>{
    res.send("Game LeaderBoard by ExpressJs");
})

application.listen(port,()=>{
    console.log(`[Server]: Running application at http://localhost:${port}`);
    connectDB(mongo_url);
})

