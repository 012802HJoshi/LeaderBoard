import mongoose from "mongoose";
import { PROFILE_SOURCES } from "../Constants/game.constants.js";

const gameProfileSchema = new mongoose.Schema(
  {
    username: { type: String, default: null, trim: true },
    levelsPlayed: { type: Number, default: 1, min: 1 },
    profileData: { type: String, default: null, trim: true },
    inAppPurchases: { type: Boolean, default: false },
    events: { type: String, default: null, trim: true },
    profileVersion: { type: Number, default: 0 },
    xp: { type: Number, default: 0 },
    source: {
      type: String,
      enum: Object.values(PROFILE_SOURCES),
      default: PROFILE_SOURCES.ANONYMOUS,
    },
  },
  { timestamps: true }
);

const GameProfile = mongoose.model("GameProfile", gameProfileSchema);

export default GameProfile;
