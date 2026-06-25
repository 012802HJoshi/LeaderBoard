export const applyMergeStrategy = (strategy, localProfile, cloudProfile) => {
  const local = localProfile.toObject
    ? localProfile.toObject()
    : { ...localProfile };
  const cloud = cloudProfile.toObject
    ? cloudProfile.toObject()
    : { ...cloudProfile };

  const result = {
    levelsPlayed: 0,
    inAppPurchases: false,
    username: cloud.username || null,
    profileData: null,
    events: null,
  };

  if (strategy === "keep_cloud") {
    result.levelsPlayed = cloud.levelsPlayed;
    result.inAppPurchases = cloud.inAppPurchases;
    result.username = cloud.username || null;
    result.profileData = cloud.profileData;
    result.events = cloud.events;
  } else if (strategy === "keep_local") {
    result.levelsPlayed = local.levelsPlayed;
    result.inAppPurchases = local.inAppPurchases;
    result.username = cloud.username || null;
    result.profileData = local.profileData;
    result.events = local.events;
  } else {
    result.levelsPlayed = Math.max(local.levelsPlayed, cloud.levelsPlayed);
    result.inAppPurchases = local.inAppPurchases || cloud.inAppPurchases;
    result.username = cloud.username || null;

    // Merge profileData: use the populated one if one is missing, otherwise select based on profileVersion
    if (local.profileData && !cloud.profileData) {
      result.profileData = local.profileData;
    } else if (!local.profileData && cloud.profileData) {
      result.profileData = cloud.profileData;
    } else {
      result.profileData = (localProfile.profileVersion >= cloudProfile.profileVersion)
        ? local.profileData
        : cloud.profileData;
    }

    // Merge events: use the populated one if one is missing, otherwise select based on profileVersion
    if (local.events && !cloud.events) {
      result.events = local.events;
    } else if (!local.events && cloud.events) {
      result.events = cloud.events;
    } else {
      result.events = (localProfile.profileVersion >= cloudProfile.profileVersion)
        ? local.events
        : cloud.events;
    }
  }

  return result;
};

export const applyMergedToProfile = (profile, merged) => {
  profile.levelsPlayed = merged.levelsPlayed;
  profile.inAppPurchases = merged.inAppPurchases;
  if (merged.username) profile.username = merged.username;
  profile.profileData = merged.profileData;
  profile.events = merged.events;
  profile.profileVersion += 1;
};
