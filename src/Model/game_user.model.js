import mongoose from "mongoose";

const powerupsSchema = new mongoose.Schema(
  {
    HoleSize: { type: Number, default: 0, min: 0 },
    Magnet: { type: Number, default: 0, min: 0 },
    Compass: { type: Number, default: 0, min: 0 },
    FreezeTime: { type: Number, default: 0, min: 0 },
    HoleBooster: { type: Number, default: 0, min: 0 },
    AddTime: { type: Number, default: 0, min: 0 },
  },
  { _id: false }
);

const purchaseSchema = new mongoose.Schema(
  {
    eventId: { type: String, required: true, trim: true },
    eventEnd:{type:Date, required:true},
    purchasedAt: { type: Date, default: Date.now },
    receiptToken: { type: String, default: null },
  },
  { _id: false }
);

const gameUserSchema = new mongoose.Schema(
  {
    anonymousId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      immutable: true,
    },
    username: {
      type: String,
      required: true,
      default: null,
      trim: true,
    },
    levelsPlayed: {
      type: Number,
      default: 0,
      min: 0,
    },
    coins: {
      type: Number,
      default: 0,
      min: 0,
    },
    powerups: {
      type: powerupsSchema,
      default: () => ({}),
    },
    authProvider: {
      type: String,
      enum: ["google.com", "facebook.com","anonymous"],
      default: "anonymous",
    },
    firebaseUid: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
    },
    purchases: {
      type: purchaseSchema
    },
    isPremium: {
      type: Boolean,
      default: false,
    },
  }
);

const GameUser = mongoose.model("GameUser", gameUserSchema);

export default GameUser;
