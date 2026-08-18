import logger from "../Utils/logger.js";

export const errorHandler = (err, req, res, next) => {
  const statusCode = err.status || err.statusCode || (res.statusCode >= 400 ? res.statusCode : 500);

  logger.error(`[Unhandled Error ${statusCode}]: ${err.message || "Internal Server Error"}`, {
    statusCode,
    stack: err.stack,
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
  });

  return res.status(statusCode).json({
    message: err.message || "Internal Server Error",
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
};
