import mongoose from "mongoose";

const deviceSchema = new mongoose.Schema(
  {
    anonymousId: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
    anonymousProfileId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "GameProfile",
      required: true,
    },
    activeProfileId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "GameProfile",
      required: true,
    },
    knownProfileIds: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: "GameProfile" }],
      default: [],
    },
    lastSeenAt: { type: Date, default: Date.now },
  },
  { timestamps: false }
);

const Device = mongoose.model("Device", deviceSchema);

export default Device;
