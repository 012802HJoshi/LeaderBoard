import GameProfile from "../Model/game_profile.model.js";
import {
    getTopPlayers,
    getPlayerRank,
    getPlayerNeighbors,
    getTotalPlayers,
    getCachedTop50,
    setCachedTop50,
    upsertScore,
} from "../Services/leaderboard.service.js";

/**
 * Enrich raw leaderboard entries with profile data from MongoDB.
 *
 * @param {Array} entries - Raw entries from Redis ({ profileId, levelsPlayed, rank })
 * @param {string|null} currentProfileId - The requesting player's profileId (to set isMe flag)
 * @returns {Array}
 */
const enrichEntries = async (entries, currentProfileId = null) => {
    if (!entries.length) return [];

    const profileIds = entries.map((p) => p.profileId);
    const profiles = await GameProfile.find({ _id: { $in: profileIds } });
    const profileMap = new Map(
        profiles.map((p) => [p._id.toString(), p])
    );

    return entries.map((entry) => {
        const profile = profileMap.get(entry.profileId);
        const result = {
            rank: entry.rank,
            profileId: entry.profileId,
            username: profile?.username || "Anonymous",
            levelsPlayed: entry.levelsPlayed,
            profileData: profile?.profileData || null,
        };
        if (currentProfileId) {
            result.isMe = entry.profileId === currentProfileId;
        }
        return result;
    });
};

/**
 * Build the enriched top-50 leaderboard, using cache when available.
 *
 * @returns {Array}
 */
const getEnrichedTop50 = async () => {
    // Try cache first
    const cached = await getCachedTop50();
    if (cached) return cached;

    // Cache miss — build from Redis + MongoDB
    const topPlayers = await getTopPlayers(50);
    const enriched = await enrichEntries(topPlayers);

    // Store in cache (no TTL — invalidated only on top-50 changes)
    await setCachedTop50(enriched);

    return enriched;
};

// ── Endpoints ───────────────────────────────────────────────────

/**
 * GET /leaderboard?range=5
 * Combined endpoint — returns everything in a single response:
 *   - top50:      Cached top 50 players
 *   - me:         Current player's rank & data (if authenticated)
 *   - aroundMe:   Players around the current player (if authenticated)
 *   - totalPlayers
 */
export const getFullLeaderboard = async (req, res) => {
    try {
        const profileId = req.profileId; // set by requireAuth (may be null for unauthenticated)
        const range = Math.min(Math.max(parseInt(req.query.range) || 5, 1), 25);

        // Always return top 50 (cached)
        const top50 = await getEnrichedTop50();
        const totalPlayers = await getTotalPlayers();

        const response = {
            top50,
            totalPlayers,
            me: null,
            aroundMe: null,
        };

        // If the player is authenticated, add their personal data
        if (profileId) {
            const { rank, levelsPlayed } = await getPlayerRank(profileId);

            if (rank !== null) {
                const profile = await GameProfile.findById(profileId);

                response.me = {
                    rank,
                    profileId,
                    username: profile?.username || "Anonymous",
                    levelsPlayed,
                    profileData: profile?.profileData || null,
                };

                // Get neighbors (skip if player is already visible in top 50)
                if (rank > 50) {
                    const neighbors = await getPlayerNeighbors(profileId, range);
                    response.aroundMe = await enrichEntries(neighbors, profileId);
                }
            }
        }

        return res.status(200).json(response);
    } catch (error) {
        return res.status(500).json({
            message: "Failed to fetch leaderboard",
            error: error.message,
        });
    }
};

/**
 * GET /leaderboard/top?count=10
 * Returns the top N players ranked by levelsPlayed.
 */
export const getLeaderboard = async (req, res) => {
    try {
        const count = Math.min(Math.max(parseInt(req.query.count) || 10, 1), 100);

        // Use cache if requesting ≤ 50
        if (count <= 50) {
            const cached = await getEnrichedTop50();
            return res.status(200).json({
                leaderboard: cached.slice(0, count),
                totalPlayers: await getTotalPlayers(),
            });
        }

        const topPlayers = await getTopPlayers(count);
        const leaderboard = await enrichEntries(topPlayers);

        return res.status(200).json({
            leaderboard,
            totalPlayers: await getTotalPlayers(),
        });
    } catch (error) {
        return res.status(500).json({
            message: "Failed to fetch leaderboard",
            error: error.message,
        });
    }
};

/**
 * GET /leaderboard/me?range=5
 * Returns current player's rank, profile info, and neighboring players on the leaderboard.
 */
export const getMyRank = async (req, res) => {
    try {
        const profileId = req.profileId;
        const range = Math.min(Math.max(parseInt(req.query.range) || 5, 1), 25);

        const { rank, levelsPlayed } = await getPlayerRank(profileId);

        if (rank === null) {
            return res.status(404).json({
                message: "Player not found on the leaderboard",
            });
        }

        const profile = await GameProfile.findById(profileId);
        const neighbors = await getPlayerNeighbors(profileId, range);
        const aroundMe = await enrichEntries(neighbors, profileId);

        const me = {
            rank,
            profileId,
            username: profile?.username || "Anonymous",
            levelsPlayed,
            profileData: profile?.profileData || null,
        };

        return res.status(200).json({
            me,
            aroundMe,
            totalPlayers: await getTotalPlayers(),
        });
    } catch (error) {
        return res.status(500).json({
            message: "Failed to fetch player rank and neighborhood",
            error: error.message,
        });
    }
};

/**
 * POST /leaderboard/score
 * Submit/update player level to the Redis leaderboard sorted set.
 * Requires authentication (Bearer token).
 * Body parameters: { levelsPlayed } or { level }
 */
export const submitScore = async (req, res) => {
    try {
        const profileId = req.profileId;
        const body = req.body || {};
        const rawLevel = body.levelsPlayed !== undefined ? body.levelsPlayed : body.level;

        if (rawLevel === undefined || rawLevel === null) {
            return res.status(400).json({
                message: "levelsPlayed or level is required",
            });
        }

        const levelsPlayed = parseInt(rawLevel, 10);
        if (isNaN(levelsPlayed) || levelsPlayed < 0) {
            return res.status(400).json({
                message: "levelsPlayed must be a non-negative integer",
            });
        }

        const profile = await GameProfile.findById(profileId);
        if (!profile) {
            return res.status(404).json({
                message: "Profile not found",
            });
        }

        profile.levelsPlayed = levelsPlayed;
        await profile.save();

        await upsertScore(
            profile._id.toString(),
            profile.levelsPlayed,
            profile.updatedAt
        );

        const { rank } = await getPlayerRank(profile._id.toString());

        return res.status(200).json({
            message: "Score submitted successfully",
            profileId: profile._id.toString(),
            levelsPlayed: profile.levelsPlayed,
            rank,
        });
    } catch (error) {
        return res.status(500).json({
            message: "Failed to submit score",
            error: error.message,
        });
    }
};

