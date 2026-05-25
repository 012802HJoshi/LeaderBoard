import { POWERUP_KEYS } from "../Constants/game.constants.js";

export const normalizeNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const formatProfile = (profile) => {
  if (!profile) return null;
  const doc = profile.toObject ? profile.toObject() : profile;
  return {
    id: doc._id,
    username: doc.username,
    levelsPlayed: doc.levelsPlayed,
    coins: doc.coins,
    powerups: doc.powerups,
    isPremium: doc.isPremium,
    purchases: doc.purchases,
    source: doc.source,
    profileVersion: doc.profileVersion,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
};

export const hasMeaningfulProgress = (profile) => {
  if (!profile) return false;
  if (profile.levelsPlayed > 0 || profile.coins > 0 || profile.isPremium) {
    return true;
  }
  if (!profile.powerups) return false;
  return POWERUP_KEYS.some((key) => (profile.powerups[key] || 0) > 0);
};

export const addKnownProfile = (device, profileId) => {
  const id = profileId.toString();
  const exists = device.knownProfileIds.some((p) => p.toString() === id);
  if (!exists) {
    device.knownProfileIds.push(profileId);
  }
};
