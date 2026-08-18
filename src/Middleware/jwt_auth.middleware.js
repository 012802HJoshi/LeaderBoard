import jwt from "jsonwebtoken";
import {
  generateAccessToken,
  getSessionType,
} from "../Services/auth.service.js";
import Device from "../Model/device.model.js";
import logger from "../Utils/logger.js";

export const requireAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    logger.error("JWT Auth Error: No token provided", {
      path: req.originalUrl,
      method: req.method,
      ip: req.ip,
    });
    return res.status(401).json({ message: "No token provided" });
  }

  const token = authHeader.split(" ")[1];

  const attachUser = (decoded) => {
    req.profileId = decoded.profileId;
    req.sessionType = decoded.sessionType;
    req.deviceId = decoded.deviceId;
    next();
  };

  try {
    attachUser(jwt.verify(token, process.env.JWT_SECRET));
  } catch (err) {
    if (err.name !== "TokenExpiredError") {
      logger.error(`JWT Auth Error: ${err.message}`, {
        path: req.originalUrl,
        method: req.method,
        ip: req.ip,
        stack: err.stack,
      });
      return res
        .status(401)
        .json({ message: "Invalid token", code: "TOKEN_INVALID" });
    }

    const refreshToken = req.headers["x-refresh-token"];

    if (!refreshToken) {
      logger.error("JWT Auth Error: Access token expired & no refresh token provided", {
        path: req.originalUrl,
        method: req.method,
        ip: req.ip,
      });
      return res.status(401).json({
        message: "Session expired, please login again",
        code: "NO_REFRESH_TOKEN",
      });
    }

    try {
      const decoded = jwt.verify(
        refreshToken,
        process.env.JWT_REFRESH_SECRET
      );

      const device = await Device.findOne({ anonymousId: decoded.deviceId });
      const sessionType = device
        ? getSessionType(device, decoded.profileId)
        : "anonymous";

      res.setHeader(
        "x-new-access-token",
        generateAccessToken(decoded.profileId, sessionType, decoded.deviceId)
      );

      req.profileId = decoded.profileId;
      req.sessionType = sessionType;
      req.deviceId = decoded.deviceId;
      next();
    } catch (refreshErr) {
      logger.error(`JWT Refresh Token Error: ${refreshErr.message}`, {
        path: req.originalUrl,
        method: req.method,
        ip: req.ip,
        stack: refreshErr.stack,
      });
      res.clearCookie("refreshToken");
      return res.status(401).json({
        message: "Session expired, please login again",
        code: "REFRESH_EXPIRED",
      });
    }
  }
};
