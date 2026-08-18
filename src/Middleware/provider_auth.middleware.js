import { OAuth2Client } from "google-auth-library";
import axios from "axios";
import logger from "../Utils/logger.js";

const google_client_id = process.env.GOOGLE_CLIENT_ID;

const client = new OAuth2Client(google_client_id);

export const provider_auth_check = async (req, res, next) => {
    const { credential, provider, userId, accessToken } = req.body || {};

    try {
        if (!provider) {
            logger.error("Provider Auth Error: Provider missing", {
                path: req.originalUrl,
                method: req.method,
                ip: req.ip,
            });
            return res.status(400).json({
                message: "Provider missing"
            });
        };

        if (provider === "google") {
            if (!credential) {
                logger.error("Google Auth Error: ID token missing", {
                    path: req.originalUrl,
                    method: req.method,
                    ip: req.ip,
                });
                return res.status(400).json({ message: "ID token missing" });
            }

            const ticket = await client.verifyIdToken({
                idToken: credential,
                audience: google_client_id
            });

            const payload = ticket.getPayload();

            req.user = {
                provider: "google",
                providerId: payload.sub,
                email: payload.email || null,
                name: payload.name || null,
                picture: payload.picture || null,
                emailVerified: payload.email_verified || false
            };

            return next();
        } else if (provider === "facebook") {
            if (!accessToken) {
                logger.error("Facebook Auth Error: Access token missing", {
                    path: req.originalUrl,
                    method: req.method,
                    ip: req.ip,
                });
                return res.status(400).json({ message: "Facebook access token missing" });
            }

            const fbRes = await axios.get("https://graph.facebook.com/me", {
                params: {
                    fields: "id,name,email,picture",
                    access_token: accessToken
                }
            });

            const fbUser = fbRes.data;

            if (userId && fbUser.id !== userId) {
                logger.error("Facebook Auth Error: Facebook user mismatch", {
                    expectedUserId: userId,
                    receivedUserId: fbUser.id,
                    path: req.originalUrl,
                    method: req.method,
                    ip: req.ip,
                });
                return res.status(401).json({
                    message: "Facebook user mismatch"
                });
            }

            req.user = {
                provider: "facebook",
                providerId: fbUser.id,
                email: fbUser.email || null,
                name: fbUser.name || null,
                picture: fbUser.picture?.data?.url || null,
                emailVerified: true
            };
            return next();
        } else {
            logger.error("Provider Auth Error: Invalid auth provider attempted", {
                provider,
                path: req.originalUrl,
                method: req.method,
                ip: req.ip,
            });
            return res.status(401).json({ message: "ni hn tere pass auth provider" });
        }

    } catch (err) {
        logger.error(`Provider Auth Error: ${err.message}`, {
            stack: err.stack,
            provider,
            path: req.originalUrl,
            method: req.method,
            ip: req.ip,
        });
        return res.status(401).json({ message: "Erorr in Middleware" });
    }
};