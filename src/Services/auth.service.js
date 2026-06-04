import jwt from "jsonwebtoken";
import { SESSION_TYPES } from "../Constants/game.constants.js";

export const generateAccessToken = (profileId, sessionType, deviceId) => {
  return jwt.sign(
    {
      profileId: profileId.toString(),
      sessionType,
      deviceId,
    },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
};

export const generateRefreshToken = (profileId, deviceId) => {
  return jwt.sign(
    {
      profileId: profileId.toString(),
      deviceId,
    },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: "30d" }
  );
};

export const getSessionType = (device, profileId) => {
  const activeId = profileId.toString();
  const anonId = device.anonymousProfileId.toString();
  return activeId === anonId ? SESSION_TYPES.ANONYMOUS : SESSION_TYPES.SOCIAL;
};

export const buildAuthResponse = (device, profile, sessionType) => {
  const accessToken = generateAccessToken(
    profile._id,
    sessionType,
    device.anonymousId
  );
  const refreshToken = generateRefreshToken(profile._id, device.anonymousId);

  return {
    token: accessToken,
    refreshToken,
    sessionType,
    device: {
      anonymousId: device.anonymousId,
      anonymousProfileId: device.anonymousProfileId,
      activeProfileId: device.activeProfileId,
      knownProfileIds: device.knownProfileIds,
    },
  };
};
