import { Router } from "express";

/** Redirects legacy /google routes to web OAuth under /auth */
export const googleRouter = Router();

googleRouter.get("/", (req, res) => {
  const query = new URLSearchParams({
    ...req.query,
    format: req.query.format || "redirect",
  });
  res.redirect(`/holeking/auth/google/start?${query.toString()}`);
});

googleRouter.get("/callback", (req, res) => {
  const query = new URLSearchParams(req.query);
  res.redirect(`/holeking/auth/google/callback?${query.toString()}`);
});
