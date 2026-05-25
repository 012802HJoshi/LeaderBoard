import Device from "../Model/device.model.js";
import GameProfile from "../Model/game_profile.model.js";
import { PROFILE_SOURCES } from "../Constants/game.constants.js";
import { addKnownProfile } from "../Utils/profile.utils.js";

export const findOrCreateDevice = async (anonymousId) => {
  let device = await Device.findOne({ anonymousId });

  if (device) {
    device.lastSeenAt = new Date();
    await device.save();
    return { device, isNew: false };
  }

  const anonymousProfile = await GameProfile.create({
    source: PROFILE_SOURCES.ANONYMOUS,
  });

  device = await Device.create({
    anonymousId,
    anonymousProfileId: anonymousProfile._id,
    activeProfileId: anonymousProfile._id,
    knownProfileIds: [anonymousProfile._id],
    lastSeenAt: new Date(),
  });

  return { device, isNew: true };
};

export const ensureDeviceForAnonymousId = async (anonymousId) => {
  let device = await Device.findOne({ anonymousId });

  if (device) {
    device.lastSeenAt = new Date();
    await device.save();
    return device;
  }

  const anonymousProfile = await GameProfile.create({
    source: PROFILE_SOURCES.ANONYMOUS,
  });

  device = await Device.create({
    anonymousId,
    anonymousProfileId: anonymousProfile._id,
    activeProfileId: anonymousProfile._id,
    knownProfileIds: [anonymousProfile._id],
    lastSeenAt: new Date(),
  });

  return device;
};

export const setActiveProfile = async (device, profileId) => {
  device.activeProfileId = profileId;
  addKnownProfile(device, profileId);
  device.lastSeenAt = new Date();
  await device.save();
  return device;
};
