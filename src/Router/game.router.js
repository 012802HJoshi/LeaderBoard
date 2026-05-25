import { Router } from "express";
import { googleRouter } from "./google.router.js";
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
} from "../Controller/profile.controller.js";
import { requireAuth } from "../Middleware/jwt_auth.middleware.js";
import { provider_auth_check } from "../Middleware/provider_auth.middleware.js";

export const gameRouter = Router();

gameRouter.use("/google", googleRouter);
gameRouter.use("/auth", oauthRouter);

gameRouter.post("/session/bootstrap", bootstrap);
gameRouter.post("/session/refresh", refreshSession);
gameRouter.get("/session/me", requireAuth, getSessionMe);

gameRouter.post("/auth/social/login", provider_auth_check, socialLogin);
gameRouter.post(
  "/auth/social/link",
  requireAuth,
  provider_auth_check,
  socialLink
);
gameRouter.post("/auth/logout", requireAuth, logout);

gameRouter.get("/profiles", requireAuth, listProfiles);
gameRouter.post("/profiles/switch", requireAuth, switchProfile);

gameRouter.patch("/progress", requireAuth, updateProgress);
gameRouter.post("/purchase/sync", requireAuth, syncPurchase);
