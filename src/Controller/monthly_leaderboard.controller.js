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
    getMonthlyEndTime,
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
            levelsPlayed: Math.max(20, profile?.levelsPlayed ?? 20),
            score: entry.score,
            profileData: profile?.profileData || "{}",
            createdAt: profile?.createdAt || null,
        };
    });
};

/**
 * Fetch top-50 monthly leaderboard with cache.
 */
const getMonthlyTop50 = async () => {
    const cached = await getCachedMonthlyTop50();
    if (cached && cached.length > 0 && cached[0].score !== undefined && cached[0].levelsPlayed !== undefined && cached[0].createdAt !== undefined) return cached;

    const topPlayers = await getMonthlyTopPlayers(50);
    const enriched = await enrichEntries(topPlayers);

    await setCachedMonthlyTop50(enriched);

    return enriched;
};

// ── Endpoints ───────────────────────────────────────────────────

/**
 * GET /monthly/leaderboard?count=50&range=5
 * Combined endpoint returning top list, player rank/neighborhood, total players, and endTime.
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
            endTime: getMonthlyEndTime(),
        };

        if (profileId) {
            const { rank } = await getMonthlyPlayerRank(profileId);
            if (rank !== null && rank > 45) {
                const neighbors = await getMonthlyPlayerNeighbors(profileId, range);
                if (neighbors.length > 0) {
                    const enriched = await enrichEntries(neighbors, profileId);
                    // Filter out any entries already present in topList to prevent overlapping/collapsing
                    const maxTopRank = topList.length;
                    const nonOverlapping = enriched.filter((entry) => entry.rank > maxTopRank);
                    response.aroundMe = nonOverlapping.length > 0 ? nonOverlapping : null;
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
 * Public endpoint returning top N players on the monthly leaderboard and endTime.
 */
export const getMonthlyLeaderboardTop = async (req, res) => {
    try {
        const count = Math.min(Math.max(parseInt(req.query.count) || 10, 1), 100);
        const endTime = getMonthlyEndTime();

        if (count <= 50) {
            const cached = await getMonthlyTop50();
            return res.status(200).json({
                leaderboard: cached.slice(0, count),
                totalPlayers: await getMonthlyTotalPlayers(),
                endTime,
            });
        }

        const topPlayers = await getMonthlyTopPlayers(count);
        const leaderboard = await enrichEntries(topPlayers);

        return res.status(200).json({
            leaderboard,
            totalPlayers: await getMonthlyTotalPlayers(),
            endTime,
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
 * Authenticated endpoint returning current player's monthly rank, neighborhood, and endTime.
 */
export const getMyMonthlyRank = async (req, res) => {
    try {
        const profileId = req.profileId;
        const range = Math.min(Math.max(parseInt(req.query.range) || 5, 1), 25);

        const { rank, score } = await getMonthlyPlayerRank(profileId);

        if (rank === null) {
            return res.status(404).json({
                message: "Player not found on the monthly leaderboard",
                endTime: getMonthlyEndTime(),
            });
        }

        const profile = await GameProfile.findById(profileId);
        const neighbors = await getMonthlyPlayerNeighbors(profileId, range);
        const aroundMe = await enrichEntries(neighbors, profileId);

        const me = {
            rank,
            profileId,
            username: profile?.username || "Anonymous",
            levelsPlayed: Math.max(20, profile?.levelsPlayed ?? 20),
            score,
            profileData: profile?.profileData || "{}",
            createdAt: profile?.createdAt || null,
        };

        return res.status(200).json({
            me,
            aroundMe,
            totalPlayers: await getMonthlyTotalPlayers(),
            endTime: getMonthlyEndTime(),
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
 * Fetch all monthly winners (top 5 for each month), populated with profileData, username, and levelsPlayed.
 * Supports optional ?month=YYYY-MM filter.
 */
export const getMonthlyWinners = async (req, res) => {
    try {
        const { month } = req.query;
        const query = month ? { month } : {};

        const monthlyWinnersDocs = await MonthlyWinner.find(query)
            .populate({
                path: "winners.profileId",
                select: "username profileData levelsPlayed createdAt",
            })
            .sort({ month: -1 });

        const monthlyWinners = monthlyWinnersDocs.map((doc) => {
            const docObj = doc.toObject ? doc.toObject() : doc;
            return {
                _id: docObj._id,
                month: docObj.month,
                winners: (docObj.winners || []).slice(0, 5).map((w) => {
                    const profile = w.profileId && typeof w.profileId === "object" ? w.profileId : null;
                    return {
                        rank: w.rank,
                        profileId: profile ? profile._id : w.profileId,
                        username: w.username || profile?.username || "Anonymous",
                        levelsPlayed: w.levelsPlayed ?? profile?.levelsPlayed ?? 1,
                        profileData: w.profileData !== undefined ? w.profileData : (profile?.profileData || null),
                        score: w.score,
                        createdAt: w.createdAt || profile?.createdAt || null,
                        claimed: w.claimed ?? false,
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
 * GET /monthly/winners/latest?count=5
 * Fetch top winners (default top 5) from the most recent monthly winner entry in MongoDB.
 */
export const getLatestMonthlyWinners = async (req, res) => {
    try {
        const count = Math.min(Math.max(parseInt(req.query.count || req.query.limit) || 5, 1), 50);

        const latestDoc = await MonthlyWinner.findOne()
            .populate({
                path: "winners.profileId",
                select: "username profileData levelsPlayed createdAt",
            })
            .sort({ month: -1, _id: -1 });

        if (!latestDoc) {
            return res.status(404).json({
                message: "No monthly winners found",
                month: null,
                winners: [],
            });
        }

        const docObj = latestDoc.toObject ? latestDoc.toObject() : latestDoc;
        const winners = (docObj.winners || []).slice(0, count).map((w) => {
            const profile = w.profileId && typeof w.profileId === "object" ? w.profileId : null;
            return {
                rank: w.rank,
                profileId: profile ? profile._id : w.profileId,
                username: w.username || profile?.username || "Anonymous",
                levelsPlayed: w.levelsPlayed ?? profile?.levelsPlayed ?? 1,
                profileData: w.profileData !== undefined ? w.profileData : (profile?.profileData || null),
                score: w.score,
                createdAt: w.createdAt || profile?.createdAt || null,
                claimed: w.claimed ?? false,
            };
        });

        return res.status(200).json({
            month: docObj.month,
            count: winners.length,
            winners,
        });
    } catch (error) {
        return res.status(500).json({
            message: "Failed to fetch latest monthly winners",
            error: error.message,
        });
    }
};

/**
 * DELETE /monthly/leaderboard/clear
 * Clear all monthly leaderboard data from Redis sorted set and top 50 cache.
 * Archives top 5 players to MonthlyWinner MongoDB collection before clearing.
 */
export const clearMonthlyLeaderboard = async (req, res) => {
    try {
        const top50Players = await getMonthlyTopPlayers(50);
        if (top50Players && top50Players.length > 0) {
            // Archive top 5 in MonthlyWinner MongoDB model
            const currentMonth = new Date().toISOString().slice(0, 7); // e.g. "2026-08"
            const top5Players = top50Players
                .filter((p) => mongoose.Types.ObjectId.isValid(p.profileId))
                .slice(0, 5);

            if (top5Players.length > 0) {
                const profileIds = top5Players.map((p) => p.profileId);
                const profiles = await GameProfile.find({ _id: { $in: profileIds } });
                const profileMap = new Map(profiles.map((p) => [p._id.toString(), p]));

                const validWinners = top5Players.map((p) => {
                    const profile = profileMap.get(p.profileId);
                    return {
                        rank: p.rank,
                        profileId: p.profileId,
                        username: profile?.username || "Anonymous",
                        levelsPlayed: profile?.levelsPlayed ?? 1,
                        profileData: profile?.profileData || null,
                        score: p.score,
                        createdAt: profile?.createdAt || null,
                        claimed: false,
                    };
                });

                await MonthlyWinner.create({
                    month: currentMonth,
                    winners: validWinners,
                });
            }
        }

        await clearMonthlyLeaderboardData();

        return res.status(200).json({
            message: "Monthly leaderboard cleared and top 5 winners archived successfully",
        });
    } catch (error) {
        return res.status(500).json({
            message: "Failed to clear monthly leaderboard",
            error: error.message,
        });
    }
};

/**
 * PATCH /monthly/winners/claim
 * Update claim status for a specific user's monthly winner entry.
 * Body/Params/Auth: { profileId, month (optional), claimed (optional boolean, default true) }
 */
export const updateMonthlyWinnerClaim = async (req, res) => {
    try {
        const body = req.body || {};
        const profileId = body.profileId || req.params.profileId || req.profileId;
        const month = body.month || req.query.month;
        const claimed = body.claimed !== undefined ? Boolean(body.claimed) : true;

        if (!profileId) {
            return res.status(400).json({
                message: "profileId is required",
            });
        }

        const query = month ? { month } : {};
        const monthlyWinnerDoc = await MonthlyWinner.findOne({
            ...query,
            "winners.profileId": profileId,
        }).sort({ month: -1 });

        if (!monthlyWinnerDoc) {
            return res.status(404).json({
                message: "Monthly winner record not found for specified user",
            });
        }

        const winnerEntry = monthlyWinnerDoc.winners.find(
            (w) => w.profileId.toString() === profileId.toString()
        );

        if (!winnerEntry) {
            return res.status(404).json({
                message: "Winner entry not found",
            });
        }

        winnerEntry.claimed = claimed;
        await monthlyWinnerDoc.save();

        return res.status(200).json({
            message: "Claim status updated successfully",
            month: monthlyWinnerDoc.month,
            profileId,
            claimed: winnerEntry.claimed,
            winner: {
                rank: winnerEntry.rank,
                profileId: winnerEntry.profileId,
                username: winnerEntry.username,
                levelsPlayed: winnerEntry.levelsPlayed,
                profileData: winnerEntry.profileData,
                score: winnerEntry.score,
                createdAt: winnerEntry.createdAt,
                claimed: winnerEntry.claimed,
            },
        });
    } catch (error) {
        return res.status(500).json({
            message: "Failed to update monthly winner claim status",
            error: error.message,
        });
    }
};

