import mongoose from "mongoose";
import {
  powerupsSchema,
  purchaseSchema,
} from "./schemas/powerups.schema.js";
import { PROFILE_SOURCES } from "../Constants/game.constants.js";

const gameProfileSchema = new mongoose.Schema(
  {
    username: { type: String, default: null, trim: true },
    levelsPlayed: { type: Number, default: 0, min: 0 },
    coins: { type: Number, default: 0, min: 0 },
    powerups: { type: powerupsSchema, default: () => ({}) },
    isPremium: { type: Boolean, default: false },
    purchases: { type: [purchaseSchema], default: [] },
    profileVersion: { type: Number, default: 0 },
    source: {
      type: String,
      enum: Object.values(PROFILE_SOURCES),
      default: PROFILE_SOURCES.ANONYMOUS,
    },
  },
  { timestamps: true }
);

gameProfileSchema.index({ updatedAt: -1 });

const GameProfile = mongoose.model("GameProfile", gameProfileSchema);

export default GameProfile;
