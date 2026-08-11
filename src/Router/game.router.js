import { Router } from "express";
// import { googleRouter } from "./google.router.js";
import { oauthRouter } from "./oauth.router.js";
import { bootstrap, getSessionMe, refreshSession } from "../Controller/session.controller.js";
import {
  socialLogin,
  socialLink,
  logout,
} from "../Controller/social_auth.controller.js";
import {
  listProfiles,
  switchProfile,
  updateProgress,
  syncPurchase,
  deleteProfile
} from "../Controller/profile.controller.js";
import {
  getFullLeaderboard,
  getLeaderboard,
  getMyRank,
  submitScore,
} from "../Controller/leaderboard.controller.js";
import {
  getFullMonthlyLeaderboard,
  getMonthlyLeaderboardTop,
  getMyMonthlyRank,
  submitMonthlyScore,
  clearMonthlyLeaderboard,
  getMonthlyWinners,
  getPreviousMonthlyLeaderboardTop,
} from "../Controller/monthly_leaderboard.controller.js";
import { requireAuth } from "../Middleware/jwt_auth.middleware.js";
import { provider_auth_check } from "../Middleware/provider_auth.middleware.js";

export const gameRouter = Router();

gameRouter.use("/auth", oauthRouter); // Tested Google OAuth 

gameRouter.post("/session/bootstrap", bootstrap); // Done  // Tested  //INUSE
gameRouter.post("/session/refresh", refreshSession); // Done  // Tested  //INUSE
gameRouter.get("/session/me", requireAuth, getSessionMe); // Done // Tested //INUSE

gameRouter.post("/auth/social/login", provider_auth_check, socialLogin);     // http://localhost:4040/holeking/auth/google/start?anonymousId=deviceIDXXX001XXX&intent=login&returnUrl=https://amezgame.com

gameRouter.post("/auth/social/link", requireAuth, provider_auth_check, socialLink); // http://localhost:4040/holeking/auth/google/start?anonymousId=deviceIDXXX001XXX&intent=link&mergeStrategy=keep_local&returnUrl=mygame://oauth

gameRouter.post("/auth/logout", requireAuth, logout); // Tested  //INUSE

gameRouter.get("/profiles", requireAuth, listProfiles); // Tested
gameRouter.post("/profiles/switch", requireAuth, switchProfile); // Tested

gameRouter.patch("/progress", requireAuth, updateProgress); // Started // Tested 
gameRouter.post("/purchase/sync", requireAuth, syncPurchase);

gameRouter.delete("/delete/profile", requireAuth, deleteProfile);

// ──Global Leaderboard ──
gameRouter.get("/global/leaderboard", requireAuth, getFullLeaderboard);       // Auth: combined — top50 (cached) + me + aroundMe
gameRouter.get("/global/leaderboard/top", getLeaderboard);                    // Public: top N players
gameRouter.get("/global/leaderboard/me", requireAuth, getMyRank);             // Auth: get my rank + players around me (?range=5)
gameRouter.post("/global/leaderboard/level", requireAuth, submitScore);        // Auth: submit/update level to leaderboard sorted set

// ──Monthly Leaderboard ──
gameRouter.get("/monthly/leaderboard", requireAuth, getFullMonthlyLeaderboard);   // Auth: combined — top50 (cached) + me + aroundMe
gameRouter.get("/monthly/leaderboard/top", getMonthlyLeaderboardTop);             // Public: top N players
gameRouter.get("/monthly/leaderboard/me", requireAuth, getMyMonthlyRank);         // Auth: get my rank + players around me (?range=5)

gameRouter.post("/monthly/leaderboard/score", requireAuth, submitMonthlyScore);   // Auth: submit/increment score in monthly sorted set

// Auth: clear monthly leaderboard data
gameRouter.delete("/monthly/leaderboard/clear", clearMonthlyLeaderboard);

// Public alias: get all monthly winners
gameRouter.get("/monthly/winners", getMonthlyWinners);                              // Public: get all monthly winners (with profileData & username)
gameRouter.get("/monthly/leaderboard/winners", getMonthlyWinners);

// Public: get previous month's top 50 stored in Redis
gameRouter.get("/monthly/leaderboard/previous", getPreviousMonthlyLeaderboardTop); 