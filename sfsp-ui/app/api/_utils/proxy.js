import { NextResponse } from "next/server";

export const runtime = "nodejs";

export const MAX_UPLOAD_BYTES = 2 * 1024 * 1024 * 1024;

export const ALLOWED_PATHS = new Set([
  "/api/files/send",
  "/api/files/sendByView",
  "/api/files/addAccesslog",
  "/api/files/addDescription",
  "/api/files/addTags",
  "/api/files/changeShareMethod",
  "/api/files/deleteFile",
  "/api/files/createFolder",
  "/api/files/download",
  "/api/files/downloadSentFile",
  "/api/files/downloadViewFile",
  "/api/files/getAccessLog",
  "/api/files/getViewAccess",
  "/api/files/metadata",
  "/api/files/removeTags",
  "/api/files/revokeViewAccess",
  "/api/files/startUpload",
  "/api/files/updateFilePath",
  "/api/files/upload",
  "/api/files/userWithFileAccess",
  //notification routes
  "/api/notifications/add",
  "/api/notifications/clear",
  "/api/notifications/getNotifications",
  "/api/notifications/markAsRead",
  "/api/notifications/respond",
  //user routes
  "/api/user/addUser",
  "/api/user/getUserById",
  "/api/user/getUserId",
  "/api/user/getUserInfo",
  "/api/user/public-keys",
]);

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 30;
const rlStore = new Map();

export function isAllowedPath(path) {
  return ALLOWED_PATHS.has(path.replace(/\/$/, ""));
}

export function rateLimit(key) {
  const now = Date.now();
  const rec = rlStore.get(key);
  if (!rec || now > rec.resetAt) {
    rlStore.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return { ok: true, remaining: RATE_LIMIT_MAX - 1 };
  }
  if (rec.count >= RATE_LIMIT_MAX) {
    return { ok: false, remaining: 0 };
  }
  rec.count++;
  return { ok: true, remaining: RATE_LIMIT_MAX - rec.count };
}

export function respond(status, body, extraHeaders = {}) {
  return NextResponse.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store",
      Pragma: "no-cache",
      ...extraHeaders,
    },
  });
}

export function getClientIP(req) {
  const h = req.headers;
  return (
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    h.get("x-real-ip") ||
    "0.0.0.0"
  );
}

export function withTimeout(promise, ms, signal) {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      const id = setTimeout(() => {
        if (signal?.abort) signal.abort();
        reject(new Error("Upstream timeout"));
      }, ms);
      promise.finally(() => clearTimeout(id));
    }),
  ]);
}

export function enforceSecurity(request, options = {}) {
  const path = new URL(request.url).pathname;
  const token = request.cookies.get("auth_token")?.value;
  const ip = getClientIP(request);
  const rateKey = options.useTokenRateLimit && token ? token : ip;

  if (!isAllowedPath(path)) {
    return respond(403, { message: "Path not allowed" });
  }

  const rate = rateLimit(rateKey);
  if (!rate.ok) {
    const resetAt = rlStore.get(rateKey)?.resetAt || Date.now();
    return respond(429, {
      message: "Rate limit exceeded",
      retryAfter: Math.ceil((resetAt - Date.now()) / 1000),
    });
  }

  return null;
}
