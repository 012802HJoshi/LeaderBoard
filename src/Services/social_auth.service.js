import GameProfile from "../Model/game_profile.model.js";
import Device from "../Model/device.model.js";
import SocialLink from "../Model/social_link.model.js";
import {
  ensureDeviceForAnonymousId,
  setActiveProfile,
} from "./device.service.js";
import { buildAuthResponse } from "./auth.service.js";
import {
  applyMergeStrategy,
  applyMergedToProfile,
} from "./merge.service.js";
import {
  addKnownProfile,
  formatProfile,
  hasMeaningfulProgress,
} from "../Utils/profile.utils.js";
import {
  MERGE_STRATEGIES,
  PROFILE_SOURCES,
  SESSION_TYPES,
} from "../Constants/game.constants.js";

export const handleSocialLogin = async (anonymousId, providerUser) => {
  const { provider, providerId, email, name, picture } = providerUser;

  let device = await ensureDeviceForAnonymousId(anonymousId);
  const anonymousProfile = await GameProfile.findById(device.anonymousProfileId);

  // If the user has meaningful local progress, automatically link and merge instead of prompting.
  if (hasMeaningfulProgress(anonymousProfile)) {
    return await handleSocialLink(anonymousId, providerUser, MERGE_STRATEGIES.MERGE_MAX);
  }

  let socialLink = await SocialLink.findOne({ provider, providerId });

  if (socialLink) {
    const cloudProfile = await GameProfile.findById(socialLink.profileId);
    if (!cloudProfile) {
      throw Object.assign(new Error("Linked profile not found"), { status: 500 });
    }

    if (email && !socialLink.email) socialLink.email = email;
    if (name) socialLink.displayName = name;
    if (picture) socialLink.picture = picture;
    await socialLink.save();

    device = await setActiveProfile(device, cloudProfile._id);
    const auth = buildAuthResponse(device, cloudProfile, SESSION_TYPES.SOCIAL);

    return {
      status: 200,
      body: {
        message: "Social login successful",
        needsLink: false,
        ...auth,
        profile: formatProfile(cloudProfile),
      },
    };
  }

  const newProfile = await GameProfile.create({
    source: PROFILE_SOURCES[provider.toUpperCase()] || PROFILE_SOURCES.SOCIAL,
    username: name || null,
  });

  socialLink = await SocialLink.create({
    provider,
    providerId,
    profileId: newProfile._id,
    email: email || null,
    displayName: name || null,
    picture: picture || null,
  });

  device = await setActiveProfile(device, newProfile._id);
  const auth = buildAuthResponse(device, newProfile, SESSION_TYPES.SOCIAL);

  return {
    status: 201,
    body: {
      message: "Social account created and linked",
      needsLink: false,
      ...auth,
      profile: formatProfile(newProfile),
      social: { provider, providerId },
    },
  };
};

export const handleSocialLink = async (deviceId, providerUser, mergeStrategy) => {
  const { provider, providerId, email, name, picture } = providerUser;

  const device = await Device.findOne({ anonymousId: deviceId });
  if (!device) {
    throw Object.assign(new Error("Device not found"), { status: 404 });
  }

  const existingLink = await SocialLink.findOne({ provider, providerId });

  if (existingLink) {
    const cloudProfile = await GameProfile.findById(existingLink.profileId);
    const localProfile = await GameProfile.findById(device.anonymousProfileId);

    if (!cloudProfile || !localProfile) {
      throw Object.assign(new Error("Profile not found"), { status: 404 });
    }

    if (localProfile._id.toString() === cloudProfile._id.toString()) {
      const auth = buildAuthResponse(device, cloudProfile, SESSION_TYPES.SOCIAL);
      return {
        status: 200,
        body: {
          message: "Already linked to this profile",
          needsLink: false,
          ...auth,
          profile: formatProfile(cloudProfile),
        },
      };
    }

    const merged = applyMergeStrategy(mergeStrategy, localProfile, cloudProfile);
    applyMergedToProfile(cloudProfile, merged);
    await cloudProfile.save();

    await setActiveProfile(device, cloudProfile._id);
    const auth = buildAuthResponse(device, cloudProfile, SESSION_TYPES.SOCIAL);

    return {
      status: 200,
      body: {
        message: "Merged with existing cloud profile",
        needsLink: false,
        mergeStrategy,
        ...auth,
        profile: formatProfile(cloudProfile),
      },
    };
  }

  const localProfile = await GameProfile.findById(device.anonymousProfileId);
  if (!localProfile) {
    throw Object.assign(new Error("Anonymous profile not found"), { status: 404 });
  }

  let targetProfile;

  if (
    mergeStrategy === MERGE_STRATEGIES.KEEP_LOCAL ||
    mergeStrategy === MERGE_STRATEGIES.MERGE_MAX
  ) {
    targetProfile = await GameProfile.create({
      source: PROFILE_SOURCES[provider.toUpperCase()] || PROFILE_SOURCES.SOCIAL,
      username: name || null,
      levelsPlayed: localProfile.levelsPlayed,
      inAppPurchases: localProfile.inAppPurchases,
      profileData: localProfile.profileData,
      events: localProfile.events,
    });
  } else {
    targetProfile = await GameProfile.create({
      source: PROFILE_SOURCES[provider.toUpperCase()] || PROFILE_SOURCES.SOCIAL,
      username: name || null,
    });
  }

  await SocialLink.create({
    provider,
    providerId,
    profileId: targetProfile._id,
    email: email || null,
    displayName: name || null,
    picture: picture || null,
  });

  const updatedDevice = await setActiveProfile(device, targetProfile._id);
  const auth = buildAuthResponse(updatedDevice, targetProfile, SESSION_TYPES.SOCIAL);

  return {
    status: 200,
    body: {
      message: "Account linked successfully",
      needsLink: false,
      mergeStrategy,
      ...auth,
      profile: formatProfile(targetProfile),
      social: { provider, providerId },
    },
  };
};
