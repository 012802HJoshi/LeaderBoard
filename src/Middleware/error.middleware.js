import logger from "../Utils/logger.js";

export const errorHandler = (err, req, res, next) => {
  logger.error(err.message || "Internal Server Error", {
    stack: err.stack,
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
  });

  const statusCode = err.status || res.statusCode || 500;
  const finalStatus = statusCode >= 400 ? statusCode : 500;

  return res.status(finalStatus).json({
    message: err.message || "Internal Server Error",
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
};
