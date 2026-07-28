import mongoose from "mongoose";

async function connectDB(mongo_url) {
  try {
    const connection = await mongoose.connect(mongo_url);
    console.log('[MongoDB]: MongoDB connected...');
  } catch (err) {
    console.error('[MongoDB]: Connection error:', err.message);
    throw new Error(`[MongoDB]: Connection Failed - ${err.message}`);
  }
}

export default connectDB;