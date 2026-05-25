import jwt from "jsonwebtoken";

export const encodeOAuthState = (payload) => {
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "15m" });
};

export const decodeOAuthState = (state) => {
  return jwt.verify(state, process.env.JWT_SECRET);
};
