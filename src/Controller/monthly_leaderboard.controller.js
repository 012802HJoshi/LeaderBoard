import GameProfile from "../Model/game_profile.model.js";
import MonthlyWinner from "../Model/monthly_winner.model.js";
import mongoose from "mongoose";
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
 * Enrich raw monthly leaderboard entries with profile data from MongoDB.
 *
 * @param {Array} entries - Raw entries from Redis ({ profileId, score, rank })
 * @param {string|null} currentProfileId - The requesting player's profileId
 * @returns {Promise<Array>}
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
        return {
            rank: entry.rank,
            profileId: entry.profileId,
            username: profile?.username || "Anonymous",
            value: entry.score,
            profileData: profile?.profileData || null,
        };
    });
};

/**
 * Fetch top-50 monthly leaderboard with cache.
 */
const getMonthlyTop50 = async () => {
    const cached = await getCachedMonthlyTop50();
    if (cached && (cached.length === 0 || cached[0].value !== undefined)) return cached;

    const topPlayers = await getMonthlyTopPlayers(50);
    const enriched = await enrichEntries(topPlayers);

    await setCachedMonthlyTop50(enriched);

    return enriched;
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
            const topPlayers = await getMonthlyTopPlayers(count);
            topList = await enrichEntries(topPlayers);
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
                    response.aroundMe = await enrichEntries(neighbors, profileId);
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

        const topPlayers = await getMonthlyTopPlayers(count);
        const leaderboard = await enrichEntries(topPlayers);

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

        const profile = await GameProfile.findById(profileId);
        const neighbors = await getMonthlyPlayerNeighbors(profileId, range);
        const aroundMe = await enrichEntries(neighbors, profileId);

        const me = {
            rank,
            profileId,
            username: profile?.username || "Anonymous",
            value: score,
            profileData: profile?.profileData || null,
        };

        return res.status(200).json({
            me,
            aroundMe,
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
 * GET /monthly/winners
 * Fetch all monthly winners (top 3 for each month), populated with profileData and username.
 * Supports optional ?month=YYYY-MM filter.
 */
export const getMonthlyWinners = async (req, res) => {
    try {
        const { month } = req.query;
        const query = month ? { month } : {};

        const monthlyWinnersDocs = await MonthlyWinner.find(query)
            .populate({
                path: "winners.profileId",
                select: "username profileData",
            })
            .sort({ month: -1 });

        const monthlyWinners = monthlyWinnersDocs.map((doc) => {
            const docObj = doc.toObject ? doc.toObject() : doc;
            return {
                _id: docObj._id,
                month: docObj.month,
                winners: (docObj.winners || []).slice(0, 3).map((w) => {
                    const profile = w.profileId && typeof w.profileId === "object" ? w.profileId : null;
                    return {
                        rank: w.rank,
                        profileId: profile ? profile._id : w.profileId,
                        username: profile?.username || "Anonymous",
                        profileData: profile?.profileData || null,
                        score: w.score,
                    };
                }),
            };
        });

        return res.status(200).json({
            count: monthlyWinners.length,
            monthlyWinners,
        });
    } catch (error) {
        return res.status(500).json({
            message: "Failed to fetch monthly winners",
            error: error.message,
        });
    }
};

/**
 * DELETE /monthly/leaderboard/clear
 * Clear all monthly leaderboard data from Redis sorted set and top 50 cache.
 * Archives current top 3 players to MonthlyWinner before clearing.
 * Requires authentication.
 */
export const clearMonthlyLeaderboard = async (req, res) => {
    try {
        const topPlayers = await getMonthlyTopPlayers(3);
        if (topPlayers && topPlayers.length > 0) {
            const currentMonth = new Date().toISOString().slice(0, 7); // e.g. "2026-08"
            const validWinners = topPlayers
                .filter((p) => mongoose.Types.ObjectId.isValid(p.profileId))
                .slice(0, 3)
                .map((p) => ({
                    rank: p.rank,
                    profileId: p.profileId,
                    score: p.score,
                }));

            if (validWinners.length > 0) {
                await MonthlyWinner.create({
                    month: currentMonth,
                    winners: validWinners,
                });
            }
        }

        await clearMonthlyLeaderboardData();

        return res.status(200).json({
            message: "Monthly leaderboard cleared and winners archived successfully",
        });
    } catch (error) {
        return res.status(500).json({
            message: "Failed to clear monthly leaderboard",
            error: error.message,
        });
    }
};

