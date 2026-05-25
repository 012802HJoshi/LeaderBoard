import { POWERUP_KEYS } from "../Constants/game.constants.js";

export const applyMergeStrategy = (strategy, localProfile, cloudProfile) => {
  const local = localProfile.toObject
    ? localProfile.toObject()
    : { ...localProfile };
  const cloud = cloudProfile.toObject
    ? cloudProfile.toObject()
    : { ...cloudProfile };

  const result = {
    levelsPlayed: 0,
    coins: 0,
    isPremium: false,
    username: cloud.username || local.username,
    powerups: {},
    purchases: [],
  };

  for (const key of POWERUP_KEYS) {
    result.powerups[key] = 0;
  }

  if (strategy === "keep_cloud") {
    result.levelsPlayed = cloud.levelsPlayed;
    result.coins = cloud.coins;
    result.isPremium = cloud.isPremium;
    result.username = cloud.username ?? local.username;
    for (const key of POWERUP_KEYS) {
      result.powerups[key] = cloud.powerups?.[key] ?? 0;
    }
    result.purchases = [...(cloud.purchases || [])];
  } else if (strategy === "keep_local") {
    result.levelsPlayed = local.levelsPlayed;
    result.coins = local.coins;
    result.isPremium = local.isPremium;
    result.username = local.username ?? cloud.username;
    for (const key of POWERUP_KEYS) {
      result.powerups[key] = local.powerups?.[key] ?? 0;
    }
    result.purchases = [...(local.purchases || [])];
  } else {
    result.levelsPlayed = Math.max(local.levelsPlayed, cloud.levelsPlayed);
    result.coins = Math.max(local.coins, cloud.coins);
    result.isPremium = local.isPremium || cloud.isPremium;
    result.username = local.username || cloud.username;
    for (const key of POWERUP_KEYS) {
      result.powerups[key] = Math.max(
        local.powerups?.[key] ?? 0,
        cloud.powerups?.[key] ?? 0
      );
    }
    const purchaseMap = new Map();
    for (const p of [...(local.purchases || []), ...(cloud.purchases || [])]) {
      purchaseMap.set(`${p.productId}:${p.platform}`, p);
    }
    result.purchases = [...purchaseMap.values()];
  }

  return result;
};

export const applyMergedToProfile = (profile, merged) => {
  profile.levelsPlayed = merged.levelsPlayed;
  profile.coins = merged.coins;
  profile.isPremium = merged.isPremium;
  if (merged.username) profile.username = merged.username;
  for (const key of POWERUP_KEYS) {
    profile.powerups[key] = merged.powerups[key];
  }
  profile.purchases = merged.purchases;
  profile.profileVersion += 1;
};
