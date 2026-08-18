import jwt from "jsonwebtoken";
import GameProfile from "../Model/game_profile.model.js";
import Device from "../Model/device.model.js";
import SocialLink from "../Model/social_link.model.js";
import { findOrCreateDevice } from "../Services/device.service.js";
import {
  buildAuthResponse,
  getSessionType,
} from "../Services/auth.service.js";
import { formatProfile } from "../Utils/profile.utils.js";
import { SESSION_TYPES } from "../Constants/game.constants.js";

import logger from "../Utils/logger.js";

export const bootstrap = async (req, res) => {
  const { anonymousId } = req.body;

  if (!anonymousId) {
    logger.error("Bootstrap Error: anonymousId is required", { path: req.originalUrl, method: req.method, ip: req.ip });
    return res.status(400).json({ message: "anonymousId is required" });
  }

  try {
    const { device, isNew } = await findOrCreateDevice(anonymousId);
    // Always fetch the anonymous profile on bootstrap
    const profile = await GameProfile.findById(device.anonymousProfileId);

    if (!profile) {
      logger.error("Bootstrap Error: Profile not found for device", { anonymousId, path: req.originalUrl, method: req.method });
      return res.status(500).json({ message: "Profile not found for device" });
    }

    // Set activeProfileId back to anonymousProfileId if it was changed
    if (device.activeProfileId.toString() !== device.anonymousProfileId.toString()) {
      device.activeProfileId = device.anonymousProfileId;
      await device.save();
    }

    const sessionType = SESSION_TYPES.ANONYMOUS;
    const auth = buildAuthResponse(device, profile, sessionType);

    return res.status(isNew ? 201 : 200).json({
      message: isNew ? "Session bootstrapped" : "Session restored",
      ...auth,
      profile: formatProfile(profile)
    });
  } catch (error) {
    logger.error(`Bootstrap Error: ${error.message}`, { stack: error.stack });
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
      logger.error("getSessionMe Error: Profile not found", { profileId: req.profileId, path: req.originalUrl, method: req.method });
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
    logger.error(`getSessionMe Error: ${error.message}`, { stack: error.stack });
    return res.status(500).json({
      message: "Failed to fetch session",
      error: error.message,
    });
  }
};

export const refreshSession = async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    logger.error("refreshSession Error: refreshToken is required", { path: req.originalUrl, method: req.method });
    return res.status(400).json({ message: "refreshToken is required" });
  }

  try {
    const decoded = jwt.verify(
      refreshToken,
      process.env.JWT_REFRESH_SECRET
    );

    const profile = await GameProfile.findById(decoded.profileId);
    if (!profile) {
      logger.error("refreshSession Error: Profile not found", { profileId: decoded.profileId, path: req.originalUrl, method: req.method });
      return res.status(404).json({ message: "Profile not found" });
    }

    const device = await Device.findOne({ anonymousId: decoded.deviceId });
    if (!device) {
      logger.error("refreshSession Error: Device not found", { deviceId: decoded.deviceId, path: req.originalUrl, method: req.method });
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
  } catch (error) {
    const decodedRefresh = jwt.decode(refreshToken);
    logger.error(`refreshSession Error: ${error?.message || "Invalid or expired refresh token"}`, {
      profileId: decodedRefresh?.profileId || null,
      stack: error?.stack,
      path: req.originalUrl,
      method: req.method,
    });
    return res.status(401).json({
      message: "Invalid or expired refresh token",
      code: "REFRESH_EXPIRED",
    });
  }
};
