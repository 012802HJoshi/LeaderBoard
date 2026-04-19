import GameUser from "../Model/game_user.model.js";

const POWERUP_KEYS = [
  "HoleSize",
  "Magnet",
  "Compass",
  "FreezeTime",
  "HoleBooster",
  "AddTime",
];

const normalizeNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const createAnonymousUser = async (req, res) => {
  const { anonymousId, username } = req.body;

  if (!anonymousId) {
    return res.status(400).json({ message: "anonymousId is required" });
  }

  try {
    const existing = await GameUser.findOne({ anonymousId });
    if (existing) {
      return res.status(200).json({
        message: "Anonymous user already exists",
        user: existing,
      });
    }

    const user = await GameUser.create({
      anonymousId,
      username: username || null,
    });

    return res.status(201).json({
      message: "Anonymous user created",
      user,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to create anonymous user",
      error: error.message,
    });
  }
};

export const checkAnonymousUser = async (req, res) => {
  const { anonymousId } = req.params;

  if (!anonymousId) {
    return res.status(400).json({ message: "anonymousId is required" });
  }

  try {
    const user = await GameUser.findOne({ anonymousId });

    if (!user) {
      return res.status(404).json({
        exists: false,
        message: "Anonymous user not found",
      });
    }

    return res.status(200).json({
      exists: true,
      message: "Anonymous user found",
      user,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to check anonymous user",
      error: error.message,
    });
  }
};

export const getAllGameUsers = async (_req, res) => {
  try {
    const users = await GameUser.find({}).sort({ createdAt: -1 });
    return res.status(200).json({
      message: "Game users fetched successfully",
      count: users.length,
      users,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to fetch game users",
      error: error.message,
    });
  }
};

export const getGameUserById = async (req, res) => {
  const { userId } = req.params;

  if (!userId) {
    return res.status(400).json({ message: "userId is required" });
  }

  try {
    const user = await GameUser.findById(userId);

    if (!user) {
      return res.status(404).json({ message: "user not found" });
    }

    return res.status(200).json({
      message: "Game user fetched successfully",
      user,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to fetch user",
      error: error.message,
    });
  }
};

export const deleteAllGameUsers = async (_req, res) => {
  try {
    const result = await GameUser.deleteMany({});
    return res.status(200).json({
      message: "All game users deleted successfully",
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to delete game users",
      error: error.message,
    });
  }
};

export const deleteGameUserById = async (req, res) => {
  const { userId } = req.params;

  if (!userId) {
    return res.status(400).json({ message: "userId is required" });
  }

  try {
    const deletedUser = await GameUser.findByIdAndDelete(userId);

    if (!deletedUser) {
      return res.status(404).json({ message: "user not found" });
    }

    return res.status(200).json({
      message: "User deleted successfully",
      user: deletedUser,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to delete user",
      error: error.message,
    });
  }
};

export const updateGameProgress = async (req, res) => {
  const { userId ,username, levelsPlayed, coins, powerups } = req.body;

  if (!userId) {
    return res.status(400).json({ message: "user is required" });
  }

  try {
    const user = await GameUser.findOne({ _id: userId });
    if (!user) {
      return res.status(404).json({ message: "user not found" });
    }

    let hasChanges = false;

    if (username !== undefined) {
      if (user.username !== username) {
        user.username = username;
        hasChanges = true;
      }
    }

    if (levelsPlayed !== undefined) {
      const nextLevelsPlayed = Math.max(
        0,
        normalizeNumber(levelsPlayed, user.levelsPlayed)
      );
      if (user.levelsPlayed !== nextLevelsPlayed) {
        user.levelsPlayed = nextLevelsPlayed;
        hasChanges = true;
      }
    }

    if (coins !== undefined) {
      const nextCoins = Math.max(0, normalizeNumber(coins, user.coins));
      if (user.coins !== nextCoins) {
        user.coins = nextCoins;
        hasChanges = true;
      }
    }

    if (powerups && typeof powerups === "object") {
      for (const key of POWERUP_KEYS) {
        if (powerups[key] !== undefined) {
          const nextPowerupValue = Math.max(
            0,
            normalizeNumber(powerups[key], user.powerups[key])
          );
          if (user.powerups[key] !== nextPowerupValue) {
            user.powerups[key] = nextPowerupValue;
            hasChanges = true;
          }
        }
      }
    }

    if (!hasChanges) {
      return res.status(200).json({ message: "No changes detected", user });
    }

    await user.save();
    return res.status(200).json({ message: "Progress updated", user });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to update progress",
      error: error.message,
    });
  }
};

export const syncPurchaseAfterFirebaseAuth = async (req, res) => {
  const { anonymousId, productId, platform, receiptToken } = req.body;
  const firebaseUser = req.firebaseUser;

  if (!anonymousId || !productId || !platform) {
    return res.status(400).json({
      message: "anonymousId, productId and platform are required",
    });
  }

  try {
    const user = await GameUser.findOne({ anonymousId });
    if (!user) {
      return res.status(404).json({ message: "Anonymous user not found" });
    }

    user.firebaseUid = firebaseUser.uid;
    user.authProvider = firebaseUser.firebase?.sign_in_provider || "unknown";
    user.isAnonymous = false;

    user.purchases.push({
      productId,
      platform,
      receiptToken: receiptToken || null,
    });

    await user.save();

    return res.status(200).json({
      message: "Purchase synced for authenticated Firebase user",
      user,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to sync purchase data",
      error: error.message,
    });
  }
};
