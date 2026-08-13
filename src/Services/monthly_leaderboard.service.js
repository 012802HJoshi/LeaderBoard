import { getRedisClient } from "../Config/connectRedis.js";

const MONTHLY_LEADERBOARD_KEY = "leaderboard:monthly";
const MONTHLY_TOP50_CACHE_KEY = "leaderboard:monthly:top50:cache";
const PREVIOUS_MONTH_TOP50_KEY = "leaderboard:monthly:previous_top50";

const MULTIPLIER = 10_000_000_000; // 10^10

/**
 * Build composite score for tie-breaking:
 * higher score -> higher rank
 * earlier updatedAt -> higher fractional tie-breaker -> better rank
 */
const buildScore = (score, updatedAt = Date.now()) => {
    const ts = Math.floor(new Date(updatedAt).getTime() / 1000);
    return score * MULTIPLIER + (MULTIPLIER - ts);
};

/**
 * Extract actual base score from composite score.
 */
const extractScore = (compositeScore) => {
    return Math.floor(compositeScore / MULTIPLIER);
};

/**
 * Invalidate top-50 cache for monthly leaderboard.
 */
const invalidateTop50Cache = async (redis) => {
    await redis.del(MONTHLY_TOP50_CACHE_KEY);
};

/**
 * Get cached top-50 monthly leaderboard.
 */
export const getCachedMonthlyTop50 = async () => {
    const redis = getRedisClient();
    const cached = await redis.get(MONTHLY_TOP50_CACHE_KEY);
    return cached ? JSON.parse(cached) : null;
};

/**
 * Set cached top-50 monthly leaderboard.
 */
export const setCachedMonthlyTop50 = async (enrichedData) => {
    const redis = getRedisClient();
    await redis.set(MONTHLY_TOP50_CACHE_KEY, JSON.stringify(enrichedData));
};

/**
 * Get previous month's top 50 stored in Redis.
 */
export const getPreviousMonthTop50 = async () => {
    const redis = getRedisClient();
    const cached = await redis.get(PREVIOUS_MONTH_TOP50_KEY);
    return cached ? JSON.parse(cached) : null;
};

/**
 * Set (overwrite) previous month's top 50 in Redis as JSON.
 */
export const setPreviousMonthTop50 = async (enrichedData) => {
    const redis = getRedisClient();
    await redis.set(PREVIOUS_MONTH_TOP50_KEY, JSON.stringify(enrichedData));
};

/**
 * Unified Register & Increment score in monthly leaderboard sorted set.
 * If player is not yet registered (zscore is null), starts from base 0 and increments by `value`.
 * If player already exists, increments current score by `value`.
 *
 * @param {string} profileId
 * @param {number} value - Points/Score value to increment by
 * @returns {Promise<{ newScore: number, rank: number }>}
 */
export const incrementMonthlyScore = async (profileId, value) => {
    const redis = getRedisClient();

    const oldRank = await redis.zrevrank(MONTHLY_LEADERBOARD_KEY, profileId);
    const wasInTop50 = oldRank !== null && oldRank < 50;

    const rawScore = await redis.zscore(MONTHLY_LEADERBOARD_KEY, profileId);
    const currentScore = rawScore !== null ? extractScore(Number(rawScore)) : 0;
    const newScore = Math.max(0, currentScore + value);

    const compositeScore = buildScore(newScore, Date.now());
    await redis.zadd(MONTHLY_LEADERBOARD_KEY, compositeScore, profileId);

    const newRank = await redis.zrevrank(MONTHLY_LEADERBOARD_KEY, profileId);
    const isInTop50 = newRank !== null && newRank < 50;

    if (wasInTop50 || isInTop50) {
        await invalidateTop50Cache(redis);
    }

    return {
        newScore,
        rank: newRank !== null ? newRank + 1 : null,
    };
};

/**
 * Get top N players from monthly leaderboard.
 */
export const getMonthlyTopPlayers = async (count = 10) => {
    const redis = getRedisClient();
    const results = await redis.zrevrange(MONTHLY_LEADERBOARD_KEY, 0, count - 1, "WITHSCORES");

    const players = [];
    for (let i = 0; i < results.length; i += 2) {
        players.push({
            profileId: results[i],
            score: extractScore(Number(results[i + 1])),
            rank: (i / 2) + 1,
        });
    }

    return players;
};

/**
 * Get player's rank and score in monthly leaderboard.
 */
export const getMonthlyPlayerRank = async (profileId) => {
    const redis = getRedisClient();

    const rank = await redis.zrevrank(MONTHLY_LEADERBOARD_KEY, profileId);
    const rawScore = await redis.zscore(MONTHLY_LEADERBOARD_KEY, profileId);

    return {
        rank: rank !== null ? rank + 1 : null,
        score: rawScore !== null ? extractScore(Number(rawScore)) : null,
    };
};

/**
 * Get player's neighbors in monthly leaderboard.
 */
export const getMonthlyPlayerNeighbors = async (profileId, range = 5) => {
    const redis = getRedisClient();

    const rank = await redis.zrevrank(MONTHLY_LEADERBOARD_KEY, profileId);
    if (rank === null) return [];

    const start = Math.max(0, rank - range);
    const stop = rank + range;

    const results = await redis.zrevrange(MONTHLY_LEADERBOARD_KEY, start, stop, "WITHSCORES");

    const players = [];
    for (let i = 0; i < results.length; i += 2) {
        players.push({
            profileId: results[i],
            score: extractScore(Number(results[i + 1])),
            rank: start + (i / 2) + 1,
        });
    }

    return players;
};

/**
 * Get total number of players in monthly leaderboard.
 */
export const getMonthlyTotalPlayers = async () => {
    const redis = getRedisClient();
    return redis.zcard(MONTHLY_LEADERBOARD_KEY);
};

/**
 * Clear all monthly leaderboard data (sorted set & top 50 cache).
 */
export const clearMonthlyLeaderboardData = async () => {
    const redis = getRedisClient();
    await redis.del(MONTHLY_LEADERBOARD_KEY);
    await redis.del(MONTHLY_TOP50_CACHE_KEY);
};

/**
 * Get end time of current UTC calendar month (ISO string).
 * e.g., for August 2026, returns 2026-09-01T00:00:00.000Z
 */
export const getMonthlyEndTime = () => {
    const now = new Date();
    const endOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1, 0, 0, 0, 0));
    return endOfMonth.toISOString();
};

