import jwt from "jsonwebtoken";
import GameProfile from "../Model/game_profile.model.js";
import Device from "../Model/device.model.js";
import SocialLink from "../Model/social_link.model.js";
import { findOrCreateDevice } from "../Services/device.service.js";
import {
  buildAuthResponse,
  getSessionType,
  generateAccessToken,
} from "../Services/auth.service.js";
import { formatProfile } from "../Utils/profile.utils.js";
import { SESSION_TYPES } from "../Constants/game.constants.js";

export const bootstrap = async (req, res) => {
  const { anonymousId } = req.body;

  if (!anonymousId) {
    return res.status(400).json({ message: "anonymousId is required" });
  }

  try {
    const { device, isNew } = await findOrCreateDevice(anonymousId);
    const profile = await GameProfile.findById(device.activeProfileId);

    if (!profile) {
      return res.status(500).json({ message: "Profile not found for device" });
    }

    const sessionType = getSessionType(device, profile._id);
    const auth = buildAuthResponse(device, profile, sessionType);
    const socialLink = await SocialLink.findOne({ profileId: profile._id });

    const anonymousToken = generateAccessToken(
      device.anonymousProfileId,
      SESSION_TYPES.ANONYMOUS,
      device.anonymousId
    );

    return res.status(isNew ? 201 : 200).json({
      message: isNew ? "Session bootstrapped" : "Session restored",
      ...auth,
      anonymousToken,
      profile: formatProfile(profile)
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to bootstrap session",
      error: error.message,
    });
  }
};

export const getSessionMe = async (req, res) => {
  try {
    const profile = await GameProfile.findById(req.profileId);
    if (!profile) {
      return res.status(404).json({ message: "Profile not found" });
    }

    const socialLink = await SocialLink.findOne({ profileId: profile._id });

    return res.status(200).json({
      sessionType: req.sessionType,
      deviceId: req.deviceId,
      profile: formatProfile(profile),
      social: socialLink
        ? {
          provider: socialLink.provider,
          providerId: socialLink.providerId,
          email: socialLink.email,
          displayName: socialLink.displayName,
          picture: socialLink.picture,
        }
        : null,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to fetch session",
      error: error.message,
    });
  }
};

export const refreshSession = async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(400).json({ message: "refreshToken is required" });
  }

  try {
    const decoded = jwt.verify(
      refreshToken,
      process.env.JWT_REFRESH_SECRET
    );

    const profile = await GameProfile.findById(decoded.profileId);
    if (!profile) {
      return res.status(404).json({ message: "Profile not found" });
    }

    const device = await Device.findOne({ anonymousId: decoded.deviceId });
    if (!device) {
      return res.status(404).json({ message: "Device not found" });
    }

    const sessionType = getSessionType(device, profile._id);
    const auth = buildAuthResponse(device, profile, sessionType);

    return res.status(200).json({
      message: "Token refreshed",
      token: auth.token,
      refreshToken: auth.refreshToken,
      sessionType: auth.sessionType,
      profile: formatProfile(profile),
    });
  } catch {
    return res.status(401).json({
      message: "Invalid or expired refresh token",
      code: "REFRESH_EXPIRED",
    });
  }
};
