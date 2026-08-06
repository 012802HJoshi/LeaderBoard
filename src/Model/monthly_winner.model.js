import mongoose from "mongoose";

const winnerEntrySchema = new mongoose.Schema(
  {
    rank: { type: Number, required: true },
    profileId: { type: mongoose.Schema.Types.ObjectId, ref: "GameProfile", required: true },
    score: { type: Number, required: true },
  },
  { _id: false }
);

const monthlyWinnerSchema = new mongoose.Schema(
  {
    month: { type: String, required: true }, // e.g. "2026-08"
    winners: [winnerEntrySchema],
    clearedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

const MonthlyWinner = mongoose.model("MonthlyWinner", monthlyWinnerSchema);

export default MonthlyWinner;
