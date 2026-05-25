import axios from "axios";

const trimEnv = (key) => process.env[key]?.trim();

export const getGoogleAuthUrl = (state, redirectUri) => {
  const clientId = trimEnv("GOOGLE_CLIENT_ID");
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email profile",
    access_type: "offline",
    prompt: "consent",
    state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
};

export const exchangeGoogleCode = async (code, redirectUri) => {
  const { data: tokenData } = await axios.post(
    "https://oauth2.googleapis.com/token",
    {
      client_id: trimEnv("GOOGLE_CLIENT_ID"),
      client_secret: trimEnv("GOOGLE_CLIENT_SECRET"),
      code,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }
  );

  const { data: profile } = await axios.get(
    "https://www.googleapis.com/oauth2/v2/userinfo",
    { headers: { Authorization: `Bearer ${tokenData.access_token}` } }
  );

  return {
    provider: "google",
    providerId: profile.id,
    email: profile.email || null,
    name: profile.name || null,
    picture: profile.picture || null,
    emailVerified: profile.verified_email || false,
  };
};

export const getFacebookAuthUrl = (state, redirectUri) => {
  const params = new URLSearchParams({
    client_id: trimEnv("FACEBOOK_APP_ID"),
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "email,public_profile",
    state,
  });
  return `https://www.facebook.com/v21.0/dialog/oauth?${params.toString()}`;
};

export const exchangeFacebookCode = async (code, redirectUri) => {
  const { data: tokenData } = await axios.get(
    "https://graph.facebook.com/v21.0/oauth/access_token",
    {
      params: {
        client_id: trimEnv("FACEBOOK_APP_ID"),
        client_secret: trimEnv("FACEBOOK_APP_SECRET"),
        redirect_uri: redirectUri,
        code,
      },
    }
  );

  const { data: profile } = await axios.get("https://graph.facebook.com/me", {
    params: {
      fields: "id,name,email,picture",
      access_token: tokenData.access_token,
    },
  });

  return {
    provider: "facebook",
    providerId: profile.id,
    email: profile.email || null,
    name: profile.name || null,
    picture: profile.picture?.data?.url || null,
    emailVerified: true,
  };
};

export const getBackendCallbackUrl = (provider, req) => {
  const base =
    trimEnv("OAUTH_CALLBACK_BASE") || `${req.protocol}://${req.get("host")}`;
  return `${base}/holeking/auth/${provider}/callback`;
};
