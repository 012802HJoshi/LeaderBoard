import { Router } from "express";
import {
  googleOAuthStart,
  googleOAuthCallback,
  facebookOAuthStart,
  facebookOAuthCallback,
} from "../Controller/oauth.controller.js";

export const oauthRouter = Router();

oauthRouter.get("/google/start", googleOAuthStart);
oauthRouter.get("/google/callback", googleOAuthCallback);
oauthRouter.get("/facebook/start", facebookOAuthStart);
oauthRouter.get("/facebook/callback", facebookOAuthCallback);
