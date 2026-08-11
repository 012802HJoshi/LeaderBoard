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
    month: { type: String, required: true },
    winners: [winnerEntrySchema]
  }
);

const MonthlyWinner = mongoose.model("MonthlyWinner", monthlyWinnerSchema);

export default MonthlyWinner;
