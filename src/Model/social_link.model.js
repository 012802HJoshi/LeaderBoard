import mongoose from "mongoose";

const socialLinkSchema = new mongoose.Schema(
  {
    provider: {
      type: String,
      enum: ["google", "facebook"],
      required: true,
    },
    providerId: { type: String, required: true, trim: true },
    profileId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "GameProfile",
      required: true,
    },
    email: { type: String, default: null, trim: true },
    displayName: { type: String, default: null, trim: true },
    picture: { type: String, default: null },
    linkedAt: { type: Date, default: Date.now },
  },
  { timestamps: false }
);

// socialLinkSchema.index({ provider: 1, providerId: 1 }, { unique: true });
socialLinkSchema.index({ profileId: 1 });

const SocialLink = mongoose.model("SocialLink", socialLinkSchema);

export default SocialLink;
