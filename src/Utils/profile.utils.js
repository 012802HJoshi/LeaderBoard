export const normalizeNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const formatProfile = (profile) => {
  if (!profile) return null;
  const doc = profile.toObject ? profile.toObject() : profile;
  return {
    id: doc._id.toString(),
    source: doc.source,
    profileVersion: doc.profileVersion,
    createdAt: doc.createdAt,
    playerData: {
      username: doc.username,
      levelsPlayed: doc.levelsPlayed,
      profileData: doc.profileData,
      events: doc.events,
    },
    inAppPurchases: doc.inAppPurchases,
  };
};

export const hasMeaningfulProgress = (profile) => {
  if (!profile) return false;
  if (
    profile.levelsPlayed > 0 ||
    profile.inAppPurchases ||
    (profile.profileData && profile.profileData.trim() !== "") ||
    (profile.events && profile.events.trim() !== "")
  ) {
    return true;
  }
  return false;
};

export const addKnownProfile = (device, profileId) => {
  const id = profileId.toString();
  const exists = device.knownProfileIds.some((p) => p.toString() === id);
  if (!exists) {
    device.knownProfileIds.push(profileId);
  }
};
