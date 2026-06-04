import {
  handleSocialLogin,
  handleSocialLink,
} from "../Services/social_auth.service.js";
import Device from "../Model/device.model.js";
import GameProfile from "../Model/game_profile.model.js";
import { buildAuthResponse } from "../Services/auth.service.js";
import { formatProfile } from "../Utils/profile.utils.js";
import { SESSION_TYPES, MERGE_STRATEGIES } from "../Constants/game.constants.js";

const VALID_MERGE = Object.values(MERGE_STRATEGIES);

export const socialLogin = async (req, res) => {
  const { anonymousId } = req.body;

  if (!anonymousId) {
    return res.status(400).json({ message: "anonymousId is required" });
  }

  try {
    const result = await handleSocialLogin(anonymousId, req.user);
    return res.status(result.status).json(result.body);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        message: "Social account already linked",
        code: "SOCIAL_ALREADY_LINKED",
      });
    }
    return res.status(error.status || 500).json({
      message: "Social login failed",
      error: error.message,
    });
  }
};

export const socialLink = async (req, res) => {
  const { mergeStrategy } = req.body;

  if (!mergeStrategy || !VALID_MERGE.includes(mergeStrategy)) {
    return res.status(400).json({
      message: `mergeStrategy must be one of: ${VALID_MERGE.join(", ")}`,
    });
  }

  try {
    const result = await handleSocialLink(
      req.deviceId,
      req.user,
      mergeStrategy
    );
    return res.status(result.status).json(result.body);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        message: "Social account already linked",
        code: "SOCIAL_ALREADY_LINKED",
      });
    }
    return res.status(error.status || 500).json({
      message: "Failed to link social account",
      error: error.message,
    });
  }
};

export const logout = async (req, res) => {
  try {
    const device = await Device.findOne({ anonymousId: req.deviceId });
    if (!device) {
      return res.status(404).json({ message: "Device not found" });
    }

    const anonymousProfile = await GameProfile.findById(
      device.anonymousProfileId
    );
    if (!anonymousProfile) {
      return res.status(404).json({ message: "Anonymous profile not found" });
    }

    const activeProfile = await GameProfile.findById(device.activeProfileId);
    if (activeProfile && activeProfile._id.toString() !== anonymousProfile._id.toString()) {
      anonymousProfile.levelsPlayed = activeProfile.levelsPlayed;
      anonymousProfile.coins = activeProfile.coins;
      anonymousProfile.isPremium = activeProfile.isPremium;
      anonymousProfile.powerups = activeProfile.powerups ? { ...activeProfile.powerups } : {};
      anonymousProfile.purchases = activeProfile.purchases ? [...activeProfile.purchases] : [];
      await anonymousProfile.save();
    }

    device.activeProfileId = device.anonymousProfileId;
    device.lastSeenAt = new Date();
    await device.save();

    const auth = buildAuthResponse(
      device,
      anonymousProfile,
      SESSION_TYPES.ANONYMOUS
    );

    return res.status(200).json({
      message: "Logged out to anonymous session",
      ...auth,
      profile: formatProfile(anonymousProfile),
    });
  } catch (error) {
    return res.status(500).json({
      message: "Logout failed",
      error: error.message,
    });
  }
};
