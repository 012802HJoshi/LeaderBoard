import mongoose from "mongoose";

async function connectDB(mongo_url){
    try{
      const connection = await mongoose.connect(mongo_url);

      console.log('[MongoDB]: MongoDB connected...');

    }catch(err){
      throw new Error("[MongoDB]: Connection Failed");
    }
}

export default connectDB;