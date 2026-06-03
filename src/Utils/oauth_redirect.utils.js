export const buildUnityRedirectUrl = (returnUrl, result) => {
  const url = new URL(returnUrl);

  url.searchParams.set(
      "payload",
      encodeURIComponent(JSON.stringify(result))
  );

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
