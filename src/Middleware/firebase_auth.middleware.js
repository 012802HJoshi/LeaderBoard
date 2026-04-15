import { getFirebaseAuth } from "../Config/firebaseAdmin.js";

export const verifyFirebaseToken = async (req, res, next) => {
  const authorization = req.headers.authorization || "";

  if (!authorization.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Missing Firebase bearer token" });
  }

  const idToken = authorization.split(" ")[1];

  try {
    const decodedToken = await getFirebaseAuth().verifyIdToken(idToken, true);
    req.firebaseUser = decodedToken;
    return next();
  } catch (error) {
    return res.status(401).json({
      message: "Invalid Firebase token",
      error: error.message,
    });
  }
};
