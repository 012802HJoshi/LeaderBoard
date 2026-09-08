import mongoose from "mongoose";

const winnerEntrySchema = new mongoose.Schema(
  {
    rank: { type: Number, required: true },
    profileId: { type: mongoose.Schema.Types.ObjectId, ref: "GameProfile", required: true },
    username: { type: String, default: null, trim: true },
    levelsPlayed: { type: Number, default: 1, min: 1 },
    profileData: { type: String, default: null, trim: true },
    score: { type: Number, required: true },
    createdAt: { type: Date, default: null },
  },
  { _id: false }
);

const monthlyWinnerSchema = new mongoose.Schema(
  {
    month: { type: String, required: true },
    winners: [winnerEntrySchema]
  }
);

const MonthlyWinner = mongoose.model("MonthlyWinner", monthlyWinnerSchema);

export default MonthlyWinner;
