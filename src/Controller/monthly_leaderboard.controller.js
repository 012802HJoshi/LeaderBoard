import {
    getMonthlyTopPlayers,
    getMonthlyPlayerRank,
    getMonthlyPlayerNeighbors,
    getMonthlyTotalPlayers,
    getCachedMonthlyTop50,
    setCachedMonthlyTop50,
    incrementMonthlyScore,
    clearMonthlyLeaderboardData,
} from "../Services/monthly_leaderboard.service.js";

/**
 * Fetch top-50 monthly leaderboard with cache.
 */
const getMonthlyTop50 = async () => {
    const cached = await getCachedMonthlyTop50();
    if (cached) return cached;

    const topPlayers = await getMonthlyTopPlayers(50);
    await setCachedMonthlyTop50(topPlayers);

    return topPlayers;
};

// ── Endpoints ───────────────────────────────────────────────────

/**
 * GET /monthly/leaderboard?count=50&range=5
 * Combined endpoint returning top list, player rank/neighborhood, and total players.
 */
export const getFullMonthlyLeaderboard = async (req, res) => {
    try {
        const profileId = req.profileId;
        const count = Math.min(Math.max(parseInt(req.query.count) || 50, 1), 100);
        const range = Math.min(Math.max(parseInt(req.query.range) || 5, 1), 25);

        let topList;
        if (count <= 50) {
            const cached = await getMonthlyTop50();
            topList = cached.slice(0, count);
        } else {
            topList = await getMonthlyTopPlayers(count);
        }

        const totalPlayers = await getMonthlyTotalPlayers();

        const response = {
            top: topList,
            aroundMe: null,
            totalPlayers,
        };

        if (profileId) {
            const { rank } = await getMonthlyPlayerRank(profileId);
            if (rank !== null && rank > 45) {
                const neighbors = await getMonthlyPlayerNeighbors(profileId, range);
                if (neighbors.length > 0) {
                    response.aroundMe = neighbors;
                }
            }
        }

        return res.status(200).json(response);
    } catch (error) {
        return res.status(500).json({
            message: "Failed to fetch monthly leaderboard",
            error: error.message,
        });
    }
};

/**
 * GET /monthly/leaderboard/top?count=10
 * Public endpoint returning top N players on the monthly leaderboard.
 */
export const getMonthlyLeaderboardTop = async (req, res) => {
    try {
        const count = Math.min(Math.max(parseInt(req.query.count) || 10, 1), 100);

        if (count <= 50) {
            const cached = await getMonthlyTop50();
            return res.status(200).json({
                leaderboard: cached.slice(0, count),
                totalPlayers: await getMonthlyTotalPlayers(),
            });
        }

        const leaderboard = await getMonthlyTopPlayers(count);

        return res.status(200).json({
            leaderboard,
            totalPlayers: await getMonthlyTotalPlayers(),
        });
    } catch (error) {
        return res.status(500).json({
            message: "Failed to fetch top monthly leaderboard",
            error: error.message,
        });
    }
};

/**
 * GET /monthly/leaderboard/me?range=5
 * Authenticated endpoint returning current player's monthly rank and neighborhood.
 */
export const getMyMonthlyRank = async (req, res) => {
    try {
        const profileId = req.profileId;
        const range = Math.min(Math.max(parseInt(req.query.range) || 5, 1), 25);

        const { rank, score } = await getMonthlyPlayerRank(profileId);

        if (rank === null) {
            return res.status(404).json({
                message: "Player not found on the monthly leaderboard",
            });
        }

        const neighbors = await getMonthlyPlayerNeighbors(profileId, range);

        const me = {
            rank,
            profileId,
            score,
        };

        return res.status(200).json({
            me,
            aroundMe: neighbors,
            totalPlayers: await getMonthlyTotalPlayers(),
        });
    } catch (error) {
        return res.status(500).json({
            message: "Failed to fetch player rank and neighborhood",
            error: error.message,
        });
    }
};

/**
 * POST /monthly/leaderboard/score
 * Submit/increment score to the monthly leaderboard sorted set.
 * Requires authentication (Bearer token).
 * Body parameters: { score } or { value } or { increment }
 */
export const submitMonthlyScore = async (req, res) => {
    try {
        const profileId = req.profileId;
        const body = req.body || {};
        const rawValue = body.score !== undefined ? body.score : (body.value !== undefined ? body.value : body.increment);

        if (rawValue === undefined || rawValue === null) {
            return res.status(400).json({
                message: "score, value, or increment parameter is required",
            });
        }

        const incrementValue = parseInt(rawValue, 10);
        if (isNaN(incrementValue) || incrementValue < 0) {
            return res.status(400).json({
                message: "Score increment value must be a non-negative integer",
            });
        }

        const { newScore, rank } = await incrementMonthlyScore(profileId, incrementValue);

        return res.status(200).json({
            message: "Monthly score submitted successfully",
            profileId,
            incrementedBy: incrementValue,
            score: newScore,
            rank,
        });
    } catch (error) {
        return res.status(500).json({
            message: "Failed to submit monthly score",
            error: error.message,
        });
    }
};

/**
 * DELETE /monthly/leaderboard/clear
 * Clear all monthly leaderboard data from Redis sorted set and top 50 cache.
 * Requires authentication.
 */
export const clearMonthlyLeaderboard = async (req, res) => {
    try {
        await clearMonthlyLeaderboardData();

        return res.status(200).json({
            message: "Monthly leaderboard cleared successfully",
        });
    } catch (error) {
        return res.status(500).json({
            message: "Failed to clear monthly leaderboard",
            error: error.message,
        });
    }
};
