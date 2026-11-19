export const POWERUP_KEYS = [
  "HoleSize",
  "Magnet",
  "Compass",
  "FreezeTime",
  "HoleBooster",
  "AddTime",
];

export const SESSION_TYPES = {
  ANONYMOUS: "anonymous",
  SOCIAL: "social",
  GOOGLE: "google",
  FACEBOOK: "facebook",
};

export const MERGE_STRATEGIES = {
  KEEP_CLOUD: "keep_cloud",
  KEEP_LOCAL: "keep_local",
  MERGE_MAX: "merge_max",
};

export const PROFILE_SOURCES = {
  ANONYMOUS: "anonymous",
  SOCIAL: "social",
  GOOGLE: "google",
  FACEBOOK: "facebook",
};

export const BANNED_MONTHLY_LEADERBOARD_PROFILE_IDS = new Set([
  "6acf2026a801bd3ff20a8bc8",
  ...(process.env.BANNED_MONTHLY_PROFILE_IDS
    ? process.env.BANNED_MONTHLY_PROFILE_IDS.split(",")
        .map((id) => id.trim())
        .filter(Boolean)
    : []),
]);

export const isMonthlyLeaderboardBanned = (profileId) => {
  if (!profileId) return false;
  return BANNED_MONTHLY_LEADERBOARD_PROFILE_IDS.has(profileId.toString());
};

