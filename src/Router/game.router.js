import { Router } from "express";
import {
  createAnonymousUser,
  updateGameProgress,
  checkAnonymousUser,
  syncPurchaseAfterFirebaseAuth,
} from "../Controller/game_user.controller.js";
import { verifyFirebaseToken } from "../Middleware/firebase_auth.middleware.js";

export const gameRouter = Router();

gameRouter.post("/anonymous/session", createAnonymousUser);
gameRouter.patch("/anonymous/progress", updateGameProgress);
gameRouter.get("/anonymous/:anonymousId", checkAnonymousUser);
gameRouter.post("/purchase/sync", verifyFirebaseToken, syncPurchaseAfterFirebaseAuth);
