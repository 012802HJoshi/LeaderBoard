import { Router } from "express";
import {
  createAnonymousUser,
  updateGameProgress,
  checkAnonymousUser,
  getAllGameUsers,
  getGameUserById,
  deleteAllGameUsers,
  deleteGameUserById,
  syncPurchaseAfterFirebaseAuth,
} from "../Controller/game_user.controller.js";
import { verifyFirebaseToken } from "../Middleware/firebase_auth.middleware.js";

export const gameRouter = Router();

gameRouter.post("/anonymous/session", createAnonymousUser);
gameRouter.patch("/anonymous/progress", updateGameProgress);
gameRouter.get("/anonymous/:anonymousId", checkAnonymousUser);
gameRouter.get("/users", getAllGameUsers);
gameRouter.get("/user/:userId", getGameUserById);
gameRouter.delete("/users", deleteAllGameUsers);
gameRouter.delete("/user/:userId", deleteGameUserById);
gameRouter.post("/purchase/sync", verifyFirebaseToken, syncPurchaseAfterFirebaseAuth);
