import mongoose from "mongoose";
import { PROFILE_SOURCES } from "../Constants/game.constants.js";

const gameProfileSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      default: null,
      trim: true
    },
    levelsPlayed: {
      type: Number,
      default: 1,
      min: 1
    },
    // Using Schema.Types.Mixed or a structured object is better than raw string
    profileData: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    },
    inAppPurchases: {
      type: Boolean,
      default: false
    },
    events: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    },
    profileVersion: {
      type: Number,
      default: 0,
      min: 0,
      required: true
    },
    xp: {
      type: Number,
      default: 0,
      min: 0 // Prevent negative values
    },
    source: {
      type: String,
      enum: Object.values(PROFILE_SOURCES),
      default: PROFILE_SOURCES.ANONYMOUS,
      required: true // Ensure a source is always present
    },
  },
  { timestamps: true }
);

const GameProfile = mongoose.model("GameProfile", gameProfileSchema);

export default GameProfile;
