export const buildUnityRedirectUrl = (returnUrl, result) => {
  const url = new URL(returnUrl);

  if (result.error) {
    url.searchParams.set("error", result.error);
    if (result.message) url.searchParams.set("message", result.message);
    url.searchParams.set("payload", JSON.stringify(result));
    return url.toString();
  }

  const { body } = result;
  url.searchParams.set("needsLink", String(!!body.needsLink));
  if (body.token) url.searchParams.set("token", body.token);
  if (body.refreshToken) url.searchParams.set("refreshToken", body.refreshToken);
  if (body.sessionType) url.searchParams.set("sessionType", body.sessionType);
  if (body.needsLink && body.provider) {
    url.searchParams.set("provider", body.provider);
    url.searchParams.set("providerId", body.providerId);
  }
  url.searchParams.set("payload", JSON.stringify(body));

  return url.toString();
};

export const renderOAuthResultPage = (result) => {
  const payload = JSON.stringify(result.body || { error: result.error });
  const prettyPayload = JSON.stringify(result.body || { error: result.error }, null, 2);
  const safePayload = payload
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026");
  const safePrettyPayload = prettyPayload
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Hole King Login</title>
</head>
<body style="font-family:sans-serif;padding:40px;">
  <h2>${result.error ? "Login failed" : "Login successful"}</h2>
  <p>${result.error ? result.message : "You can close this window and return to the game."}</p>
  <pre style="background:#f4f4f4;border:1px solid #ddd;border-radius:8px;overflow:auto;padding:16px;text-align:left;white-space:pre-wrap;">${safePrettyPayload}</pre>
  <script>window.__OAUTH_RESULT__ = ${safePayload};</script>
</body>
</html>`;
};
