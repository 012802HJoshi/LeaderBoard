let config = null;

function getConfig() {
  if (config) return config;

  const endpoint = process.env.LOGTAIL_ENDPOINT ? process.env.LOGTAIL_ENDPOINT.trim() : null;
  const token = process.env.LOGTAIL_SOURCE_TOKEN ? process.env.LOGTAIL_SOURCE_TOKEN.trim() : null;

  if (endpoint) {
    try {
      const parsed = new URL(endpoint);
      const authToken = parsed.username || token;
      parsed.username = "";
      parsed.password = "";
      const headers = { "Content-Type": "application/json" };
      if (authToken) {
        headers["Authorization"] = `Bearer ${authToken}`;
      }
      config = {
        url: parsed.toString(),
        headers,
      };
    } catch {
      const headers = { "Content-Type": "application/json" };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
      config = {
        url: endpoint,
        headers,
      };
    }
  } else if (token) {
    config = {
      url: "https://in.logs.betterstack.com",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
    };
  }

  return config;
}

async function sendLog(level, message, meta = {}) {
  const cfg = getConfig();
  if (!cfg || !cfg.url) return;

  try {
    const payload = {
      dt: new Date().toISOString(),
      level,
      message,
      ...meta,
    };
    const res = await fetch(cfg.url, {
      method: "POST",
      headers: cfg.headers,
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error(`[Logtail HTTP Response ${res.status}]: ${text}`);
    }
  } catch (err) {
    console.error(`[Logtail HTTP Error]: ${err.message}`);
  }
}

export const logger = {
  info: (message, meta = {}) => {
    console.log(`[INFO] ${message}`, Object.keys(meta).length ? meta : "");
    sendLog("info", message, meta);
  },
  warn: (message, meta = {}) => {
    console.warn(`[WARN] ${message}`, Object.keys(meta).length ? meta : "");
    sendLog("warn", message, meta);
  },
  error: (message, meta = {}) => {
    console.error(`[ERROR] ${message}`, Object.keys(meta).length ? meta : "");
    sendLog("error", message, meta);
  },
  flush: async () => {},
};

export default logger;
