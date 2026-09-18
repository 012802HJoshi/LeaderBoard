import { getRedisClient } from "../Config/connectRedis.js";

const LEADERBOARD_KEY = "leaderboard:levels";
const TOP50_CACHE_KEY = "leaderboard:top50:cache";

/**
 * Precision multiplier — large enough to hold a Unix-seconds timestamp
 * in the fractional part while keeping levelsPlayed in the integer part.
 *
 *   compositeScore = levelsPlayed * MULTIPLIER + (MULTIPLIER - timestampSeconds)
 *
 * • Higher levelsPlayed  → higher score → better rank
 * • Same levelsPlayed, earlier updatedAt → higher fractional part → better rank
 *
 * Safe up to ~900 000 levels (IEEE-754 double has 53 bits of integer precision).
 */
const MULTIPLIER = 10_000_000_000; // 10^10

/**
 * Build the composite score from levelsPlayed + updatedAt.
 *
 * @param {number} levelsPlayed
 * @param {Date|string|number} updatedAt
 * @returns {number}
 */

const buildScore = (levelsPlayed, updatedAt) => {
    const ts = Math.floor(new Date(updatedAt).getTime() / 1000);
    return levelsPlayed * MULTIPLIER + (MULTIPLIER - ts);
};

/**
 * Extract levelsPlayed from a composite score.
 *
 * @param {number} compositeScore
 * @returns {number}
 */

const extractLevelsPlayed = (compositeScore) => {
    return Math.floor(compositeScore / MULTIPLIER);
};

// ── Top 50 Cache ────────────────────────────────────────────────

/**
 * Invalidate the top-50 cache.
 * Called only when a player in (or entering) the top 50 changes.
 */
const invalidateTop50Cache = async (redis) => {
    await redis.del(TOP50_CACHE_KEY);
};

/**
 * Get the cached top-50 leaderboard (raw Redis data, not enriched).
 * Returns null on cache miss.
 *
 * @returns {Array|null}
 */
export const getCachedTop50 = async () => {
    const redis = getRedisClient();
    const cached = await redis.get(TOP50_CACHE_KEY);
    return cached ? JSON.parse(cached) : null;
};

/**
 * Set the top-50 cache with the enriched leaderboard data.
 * No TTL — only invalidated on actual changes to top 50.
 *
 * @param {Array} enrichedData - The fully enriched top-50 array
 */
export const setCachedTop50 = async (enrichedData) => {
    const redis = getRedisClient();
    await redis.set(TOP50_CACHE_KEY, JSON.stringify(enrichedData));
};

// ── Core operations ─────────────────────────────────────────────

/**
 * Add or update a player's leaderboard entry.
 * Uses ZADD — if the member already exists, the score is replaced.
 * Smartly invalidates the top-50 cache only when necessary.
 *
 * @param {string} profileId
 * @param {number} levelsPlayed
 * @param {Date|string|number} updatedAt
 */

export const upsertScore = async (profileId, levelsPlayed, updatedAt) => {
    const redis = getRedisClient();

    // Check if player was previously in top 50
    const oldRank = await redis.zrevrank(LEADERBOARD_KEY, profileId);
    const wasInTop50 = oldRank !== null && oldRank < 50;

    // Update the score
    const score = buildScore(levelsPlayed, updatedAt);
    await redis.zadd(LEADERBOARD_KEY, score, profileId);

    // Check if player is now in top 50
    const newRank = await redis.zrevrank(LEADERBOARD_KEY, profileId);
    const isInTop50 = newRank !== null && newRank < 50;

    // Invalidate cache only if this affects top 50
    if (wasInTop50 || isInTop50) {
        await invalidateTop50Cache(redis);
    }
};

/**
 * Get a player's rank and levelsPlayed.
 * Rank is 1-indexed from the top (highest score = rank 1).
 *
 * @param {string} profileId
 * @returns {{ rank: number|null, levelsPlayed: number|null }}
 */
export const getPlayerRank = async (profileId) => {
    const redis = getRedisClient();

    const rank = await redis.zrevrank(LEADERBOARD_KEY, profileId);
    const rawScore = await redis.zscore(LEADERBOARD_KEY, profileId);

    return {
        rank: rank !== null ? rank + 1 : null,
        levelsPlayed: rawScore !== null ? extractLevelsPlayed(Number(rawScore)) : null,
    };
};

/**
 * Get the top N players from the leaderboard.
 *
 * @param {number} count - How many top players to return (default 10)
 * @returns {Array<{ profileId: string, levelsPlayed: number, rank: number }>}
 */

export const getTopPlayers = async (count = 10) => {
    const redis = getRedisClient();

    const results = await redis.zrevrange(LEADERBOARD_KEY, 0, count - 1, "WITHSCORES");

    const players = [];
    for (let i = 0; i < results.length; i += 2) {
        players.push({
            profileId: results[i],
            levelsPlayed: extractLevelsPlayed(Number(results[i + 1])),
            rank: (i / 2) + 1,
        });
    }

    return players;
};

/**
 * Get players around a specific player (their neighborhood).
 * Returns `range` players above and below the target player.
 *
 * @param {string} profileId
 * @param {number} range - Number of neighbors on each side (default 5)
 * @returns {Array<{ profileId: string, levelsPlayed: number, rank: number }>}
 */

export const getPlayerNeighbors = async (profileId, range = 5) => {
    const redis = getRedisClient();

    const rank = await redis.zrevrank(LEADERBOARD_KEY, profileId);
    if (rank === null) return [];

    const start = Math.max(0, rank - range);
    const stop = rank + range;

    const results = await redis.zrevrange(LEADERBOARD_KEY, start, stop, "WITHSCORES");

    const players = [];
    for (let i = 0; i < results.length; i += 2) {
        players.push({
            profileId: results[i],
            levelsPlayed: extractLevelsPlayed(Number(results[i + 1])),
            rank: start + (i / 2) + 1,
        });
    }

    return players;
};

/**
 * Get total number of players on the leaderboard.
 *
 * @returns {number}
 */

export const getTotalPlayers = async () => {
    const redis = getRedisClient();
    return redis.zcard(LEADERBOARD_KEY);
};

/**
 * Remove a player from the leaderboard.
 * Invalidates top-50 cache if the removed player was in it.
 *
 * @param {string} profileId
 */

export const removePlayer = async (profileId) => {
    const redis = getRedisClient();

    const rank = await redis.zrevrank(LEADERBOARD_KEY, profileId);
    await redis.zrem(LEADERBOARD_KEY, profileId);

    if (rank !== null && rank < 50) {
        await invalidateTop50Cache(redis);
    }
};
