import jwt from "jsonwebtoken";
import { generateToken } from "../Controller/authentication.controller.js";

export const requireAuth = (req,res,next) =>{
    const authHeader = req.headers.authorization;
    
    if(!authHeader?.startsWith("Bearer ")){
       return res.status(401).json({ message: "No token provided" });
    }

    const token = authHeader.split(" ")[1];

    try{
        const decoded = jwt.verify(token,process.env.JWT_SECRET);

        req.userId = decoded.userId;
        next();

    }catch(err){
     if (err.name !== "TokenExpiredError") {
      return res.status(401).json({ message: "Invalid token", code: "TOKEN_INVALID" });
    }

     const refreshToken = req.cookies?.refreshToken;

     if (!refreshToken) {
      return res.status(401).json({ message: "Session expired, please login again", code: "NO_REFRESH_TOKEN" });
    }

    try{
       const decoded = jwt.verify(refreshToken,process.env.JWT_REFRESH_SECRET);

       const newAccessToken = generateToken(decoded.userId);
       
       res.setHeader("x-new-access-token", newAccessToken);
 
       req.userId = decoded.userId;
       next();
    }catch(error){
      res.clearCookie("refreshToken");
      return res.status(401).json({ message: "Session expired, please login again", code: "REFRESH_EXPIRED" });
    }
    }
};
