import {
  encodeOAuthState,
  decodeOAuthState,
} from "../Services/oauth.state.service.js";
import {
  getGoogleAuthUrl,
  exchangeGoogleCode,
  getFacebookAuthUrl,
  exchangeFacebookCode,
  getBackendCallbackUrl,
} from "../Services/oauth.provider.service.js";
import {
  handleSocialLogin,
  handleSocialLink,
} from "../Services/social_auth.service.js";
import {
  buildUnityRedirectUrl,
  renderOAuthResultPage,
} from "../Utils/oauth_redirect.utils.js";
import { MERGE_STRATEGIES } from "../Constants/game.constants.js";

const VALID_INTENTS = ["login", "link"];
const VALID_MERGE = Object.values(MERGE_STRATEGIES);

const parseStartQuery = (req) => {
  const {
    anonymousId,
    returnUrl,
    intent = "login",
    mergeStrategy,
    format = "redirect",
  } = req.query;

  if (!anonymousId) {
    return { error: "anonymousId is required", status: 400 };
  }

  if (!VALID_INTENTS.includes(intent)) {
    return { error: "intent must be login or link", status: 400 };
  }

  if (intent === "link") {
    if (!mergeStrategy || !VALID_MERGE.includes(mergeStrategy)) {
      return {
        error: `mergeStrategy required for link (${VALID_MERGE.join(", ")})`,
        status: 400,
      };
    }
  }

  return {
    anonymousId,
    returnUrl: returnUrl || null,
    intent,
    mergeStrategy: intent === "link" ? mergeStrategy : null,
    format,
  };
};

const startOAuth = (provider) => async (req, res) => {
  const parsed = parseStartQuery(req);
  if (parsed.error) {
    return res.status(parsed.status).json({ message: parsed.error });
  }

  try {
    const callbackUri = getBackendCallbackUrl(provider, req);
    const state = encodeOAuthState({
      anonymousId: parsed.anonymousId,
      returnUrl: parsed.returnUrl,
      intent: parsed.intent,
      mergeStrategy: parsed.mergeStrategy,
      provider,
    });

    const authUrl =
      provider === "google"
        ? getGoogleAuthUrl(state, callbackUri)
        : getFacebookAuthUrl(state, callbackUri);

    if (parsed.format === "json") {
      return res.status(200).json({
        message: "Open this URL in the browser",
        authUrl,
        provider,
        callbackUri,
      });
    }

    return res.redirect(authUrl);
  } catch (error) {
    return res.status(500).json({
      message: `Failed to start ${provider} OAuth`,
      error: error.message,
    });
  }
};

const completeOAuth = (provider) => async (req, res) => {
  const { code, state, error: oauthError } = req.query;

  let oauthState;
  try {
    if (!state) throw new Error("Missing state");
    oauthState = decodeOAuthState(state);
  } catch {
    return res
      .status(400)
      .send(
        renderOAuthResultPage({
          error: "INVALID_STATE",
          message: "OAuth state invalid or expired",
        })
      );
  }

  const { anonymousId, returnUrl, intent, mergeStrategy } = oauthState;

  if (oauthError) {
    const fail = { error: "OAUTH_DENIED", message: oauthError };
    if (returnUrl) return res.redirect(buildUnityRedirectUrl(returnUrl, fail));
    return res.status(400).send(renderOAuthResultPage(fail));
  }

  if (!code) {
    const fail = { error: "NO_CODE", message: "Authorization code missing" };
    if (returnUrl) return res.redirect(buildUnityRedirectUrl(returnUrl, fail));
    return res.status(400).send(renderOAuthResultPage(fail));
  }

  try {
    const callbackUri = getBackendCallbackUrl(provider, req);
    const providerUser =
      provider === "google"
        ? await exchangeGoogleCode(code, callbackUri)
        : await exchangeFacebookCode(code, callbackUri);

    const result =
      intent === "link"
        ? await handleSocialLink(anonymousId, providerUser, mergeStrategy)
        : await handleSocialLogin(anonymousId, providerUser);

    if (returnUrl) {
      return res.redirect(buildUnityRedirectUrl(returnUrl, result));
    }

    console.log("result", result);
    return res.status(result.status).send(renderOAuthResultPage(result));

  } catch (error) {
    const fail = {
      error: error.code === 11000 ? "SOCIAL_ALREADY_LINKED" : "OAUTH_FAILED",
      message:
        error.code === 11000
          ? "This account is already linked"
          : error.message,
    };
    if (returnUrl) return res.redirect(buildUnityRedirectUrl(returnUrl, fail));
    return res.status(error.status || 500).send(renderOAuthResultPage(fail));
  }
};

export const googleOAuthStart = startOAuth("google");
export const googleOAuthCallback = completeOAuth("google");
export const facebookOAuthStart = startOAuth("facebook");
export const facebookOAuthCallback = completeOAuth("facebook");
