import mongoose from "mongoose";
import logger from "../Utils/logger.js";

async function connectDB(mongo_url){
    try{
      const connection = await mongoose.connect(mongo_url);
      logger.info("[MongoDB]: MongoDB connected...");
    }catch(err){
      logger.error(`[MongoDB]: Connection Failed - Error: ${err.message}`, { stack: err.stack });
      throw new Error("[MongoDB]: Connection Failed");
    }
}

export default connectDB;