import { Logtail } from "@logtail/node";

let logtail = null;

function getLogtail() {
  if (!logtail && process.env.LOGTAIL_SOURCE_TOKEN) {
    const token = process.env.LOGTAIL_SOURCE_TOKEN;
    const endpoint = process.env.LOGTAIL_ENDPOINT;
    const options = endpoint ? { endpoint } : {};
    logtail = new Logtail(token, options);
  }
  return logtail;
}

export const logger = {
  info: (message, meta = {}) => {
    console.log(`[INFO] ${message}`, Object.keys(meta).length ? meta : "");
    const client = getLogtail();
    if (client) client.info(message, meta);
  },
  warn: (message, meta = {}) => {
    console.warn(`[WARN] ${message}`, Object.keys(meta).length ? meta : "");
    const client = getLogtail();
    if (client) client.warn(message, meta);
  },
  error: (message, meta = {}) => {
    console.error(`[ERROR] ${message}`, Object.keys(meta).length ? meta : "");
    const client = getLogtail();
    if (client) client.error(message, meta);
  },
  flush: async () => {
    const client = getLogtail();
    if (client) await client.flush();
  },
};

export default logger;
