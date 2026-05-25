import mongoose from "mongoose";

export const powerupsSchema = new mongoose.Schema(
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

export const purchaseSchema = new mongoose.Schema(
  {
    productId: { type: String, required: true, trim: true },
    platform: { type: String, required: true, trim: true },
    receiptToken: { type: String, default: null },
    purchasedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);
