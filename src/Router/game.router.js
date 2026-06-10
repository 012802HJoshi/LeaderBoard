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
import { requireAuth } from "../Middleware/jwt_auth.middleware.js";
import { provider_auth_check } from "../Middleware/provider_auth.middleware.js";

export const gameRouter = Router();

gameRouter.use("/auth", oauthRouter); // Tested Google OAuth 

gameRouter.post("/session/bootstrap", bootstrap); // Done  // Tested
gameRouter.post("/session/refresh", refreshSession); // Done  // Tested
gameRouter.get("/session/me", requireAuth, getSessionMe); // Done // Tested

gameRouter.post("/auth/social/login", provider_auth_check, socialLogin);     // http://localhost:4040/holeking/auth/google/start?anonymousId=deviceIDXXX001XXX&intent=login&returnUrl=https://amezgame.com

gameRouter.post("/auth/social/link",requireAuth,provider_auth_check,socialLink); // http://localhost:4040/holeking/auth/google/start?anonymousId=deviceIDXXX001XXX&intent=link&mergeStrategy=keep_local&returnUrl=mygame://oauth

gameRouter.post("/auth/logout", requireAuth, logout); // Tested

gameRouter.get("/profiles", requireAuth, listProfiles); // Tested
gameRouter.post("/profiles/switch", requireAuth, switchProfile); // Tested

gameRouter.patch("/progress", requireAuth, updateProgress); // Started // Tested 
gameRouter.post("/purchase/sync", requireAuth, syncPurchase); 

gameRouter.delete("/delete/profile",requireAuth,deleteProfile);
