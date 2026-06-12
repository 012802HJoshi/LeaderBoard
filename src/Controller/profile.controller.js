import GameProfile from "../Model/game_profile.model.js";
import Device from "../Model/device.model.js";
import SocialLink from "../Model/social_link.model.js";
import {
  buildAuthResponse,
  getSessionType,
} from "../Services/auth.service.js";
import { setActiveProfile } from "../Services/device.service.js";
import { formatProfile, normalizeNumber } from "../Utils/profile.utils.js";
import {
  POWERUP_KEYS,
  PROFILE_SOURCES,
  SESSION_TYPES,
} from "../Constants/game.constants.js";

export const listProfiles = async (req, res) => {
  try {
    const device = await Device.findOne({ anonymousId: req.deviceId });
    if (!device) {
      return res.status(404).json({ message: "Device not found" });
    }

    const profiles = await GameProfile.find({
      _id: { $in: device.knownProfileIds },
    });

    const socialLinks = await SocialLink.find({
      profileId: { $in: device.knownProfileIds },
    });

    const socialByProfile = new Map(
      socialLinks.map((s) => [s.profileId.toString(), s])
    );

    const list = profiles.map((p) => {
      const social = socialByProfile.get(p._id.toString());
      return {
        ...formatProfile(p),
        isActive: p._id.toString() === device.activeProfileId.toString(),
        isAnonymous:
          p._id.toString() === device.anonymousProfileId.toString(),
        social: social
          ? {
              provider: social.provider,
              providerId: social.providerId,
              email: social.email,
              displayName: social.displayName,
              picture: social.picture,
            }
          : null,
      };
    });

    return res.status(200).json({
      activeProfileId: device.activeProfileId,
      profiles: list,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to list profiles",
      error: error.message,
    });
  }
};

export const switchProfile = async (req, res) => {
  const { profileId } = req.body;

  if (!profileId) {
    return res.status(400).json({ message: "profileId is required" });
  }

  try {
    const device = await Device.findOne({ anonymousId: req.deviceId });
    if (!device) {
      return res.status(404).json({ message: "Device not found" });
    }

    const isKnown = device.knownProfileIds.some(
      (id) => id.toString() === profileId
    );
    if (!isKnown) {
      return res.status(403).json({
        message: "Profile not available on this device",
        code: "PROFILE_NOT_ON_DEVICE",
      });
    }

    const profile = await GameProfile.findById(profileId);
    if (!profile) {
      return res.status(404).json({ message: "Profile not found" });
    }

    const updatedDevice = await setActiveProfile(device, profile._id);
    const sessionType = getSessionType(updatedDevice, profile._id);
    const auth = buildAuthResponse(updatedDevice, profile, sessionType);

    return res.status(200).json({
      message: "Profile switched",
      ...auth,
      profile: formatProfile(profile),
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to switch profile",
      error: error.message,
    });
  }
};

export const updateProgress = async (req, res) => {
  const { username, levelsPlayed, coins, powerups, profileVersion } = req.body;

  try {
    const profile = await GameProfile.findById(req.profileId);
    if (!profile) {
      return res.status(404).json({ message: "Profile not found" });
    }

    if (
      profileVersion !== undefined &&
      profileVersion !== profile.profileVersion
    ) {
      return res.status(409).json({
        message: "Profile was updated elsewhere",
        code: "STALE_PROFILE",
        profile: formatProfile(profile),
      });
    }

    let hasChanges = false;

    if (username !== undefined && profile.username !== username) {
      profile.username = username;
      hasChanges = true;
    }

    if (levelsPlayed !== undefined) {
      const next = Math.max(
        0,
        normalizeNumber(levelsPlayed, profile.levelsPlayed)
      );
      if (profile.levelsPlayed !== next) {
        profile.levelsPlayed = next;
        hasChanges = true;
      }
    }

    if (coins !== undefined) {
      const next = Math.max(0, normalizeNumber(coins, profile.coins));
      if (profile.coins !== next) {
        profile.coins = next;
        hasChanges = true;
      }
    }

    if (powerups && typeof powerups === "object") {
      for (const key of POWERUP_KEYS) {
        if (powerups[key] !== undefined) {
          const next = Math.max(
            0,
            normalizeNumber(powerups[key], profile.powerups[key])
          ); 
          if (profile.powerups[key] !== next) {
            profile.powerups[key] = next;
            hasChanges = true;
          }
        }
      }
    }

    if (!hasChanges) {
      return res.status(200).json({
        message: "No changes detected",
        profile: formatProfile(profile),
      });
    }

    profile.profileVersion += 1;
    await profile.save();

    return res.status(200).json({
      message: "Progress updated",
      profile: formatProfile(profile),
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to update progress",
      error: error.message,
    });
  }
};

export const syncPurchase = async (req, res) => {
  const { productId, platform, receiptToken } = req.body;

  if (!productId || !platform) {
    return res.status(400).json({
      message: "productId and platform are required",
    });
  }

  try {
    const profile = await GameProfile.findById(req.profileId);
    if (!profile) {
      return res.status(404).json({ message: "Profile not found" });
    }

    const duplicate = profile.purchases.some(
      (p) => p.productId === productId && p.platform === platform
    );

    if (!duplicate) {
      profile.purchases.push({
        productId,
        platform,
        receiptToken: receiptToken || null,
        purchasedAt: new Date(),
      });
      profile.profileVersion += 1;
      await profile.save();
    }

    return res.status(200).json({
      message: "Purchase synced",
      profile: formatProfile(profile),
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to sync purchase",
      error: error.message,
    });
  }
};

export const deleteProfile = async (req, res) => {
  const { profileId, deviceId } = req;
  const nextLevel = req.body?.levelsPlayed ?? req.body?.level;

  try {
    const device = await Device.findOne({ anonymousId: deviceId });
    if (!device) {
      return res.status(404).json({ message: "Device not found" });
    }

    const isKnown = device.knownProfileIds.some(
      (id) => id.toString() === profileId.toString()
    );
    if (!isKnown) {
      return res.status(403).json({
        message: "Profile not available on this device",
        code: "PROFILE_NOT_ON_DEVICE",
      });
    }

    const anonymousProfile = await GameProfile.findById(
      device.anonymousProfileId
    );
    if (!anonymousProfile) {
      return res.status(404).json({ message: "Anonymous profile not found" });
    }

    const deletingAnonymous =
      device.anonymousProfileId.toString() === profileId.toString();
    if (deletingAnonymous) {
      if (nextLevel === undefined) {
        return res.status(400).json({
          message: "levelsPlayed is required",
        });
      }

      const parsedLevel = normalizeNumber(nextLevel, null);
      if (parsedLevel === null || parsedLevel < 0) {
        return res.status(400).json({
          message: "levelsPlayed must be a non-negative number",
        });
      }

      anonymousProfile.levelsPlayed = parsedLevel;
      for (const key of POWERUP_KEYS) {
        anonymousProfile.powerups[key] = 0;
      }
      anonymousProfile.profileVersion += 1;
      await anonymousProfile.save();

      device.activeProfileId = device.anonymousProfileId;
      device.lastSeenAt = new Date();
      await device.save();

      const auth = buildAuthResponse(
        device,
        anonymousProfile,
        SESSION_TYPES.ANONYMOUS
      );

      return res.status(200).json({
        message: "Anonymous profile reset and activated",
        ...auth,
        profile: formatProfile(anonymousProfile),
      });
    }

    const deletedProfile = await GameProfile.findById(profileId);
    if (!deletedProfile) {
      return res.status(404).json({ message: "Profile not found" });
    }

    if (deletedProfile.source !== PROFILE_SOURCES.SOCIAL) {
      return res.status(400).json({
        message: "Only social profiles can be deleted with this endpoint",
        code: "PROFILE_NOT_SOCIAL",
      });
    }

    if (nextLevel !== undefined) {
      const parsedLevel = normalizeNumber(nextLevel, null);
      if (parsedLevel === null || parsedLevel < 0) {
        return res.status(400).json({
          message: "levelsPlayed must be a non-negative number",
        });
      }

      anonymousProfile.levelsPlayed = parsedLevel;
      for (const key of POWERUP_KEYS) {
        anonymousProfile.powerups[key] = 0;
      }


      anonymousProfile.profileVersion += 1;
      await anonymousProfile.save();
    }

    await SocialLink.deleteMany({ profileId });
    await GameProfile.findByIdAndDelete(profileId);

    device.knownProfileIds = device.knownProfileIds.filter(
      (id) => id.toString() !== profileId.toString()
    );
    device.activeProfileId = device.anonymousProfileId;
    device.lastSeenAt = new Date();
    await device.save();

    const auth = buildAuthResponse(
      device,
      anonymousProfile,
      SESSION_TYPES.ANONYMOUS
    );

    return res.status(200).json({
      message: "Social profile deleted and anonymous profile activated",
      deletedProfileId: profileId,
      ...auth,
      profile: formatProfile(anonymousProfile),
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to delete profile",
      error: error.message,
    });
  }
};