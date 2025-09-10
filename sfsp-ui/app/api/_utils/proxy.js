import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";

export const runtime = "nodejs";

export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024; // 25MB

export const ALLOWED_MIME = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "application/zip",
  "application/octet-stream",
]);

export const ALLOWED_PATHS = new Set([
  "/api/files/send",
  "/api/files/sendByView",
]);

const RATE_LIMIT_WINDOW_MS = 60_000; // 1 min
const RATE_LIMIT_MAX = 30;
const rlStore = new Map();

export function rateLimit(ip) {
  const now = Date.now();
  const rec = rlStore.get(ip);
  if (!rec || now > rec.resetAt) {
    rlStore.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return { ok: true, remaining: RATE_LIMIT_MAX - 1 };
  }
  if (rec.count >= RATE_LIMIT_MAX) {
    return { ok: false, remaining: 0 };
  }
  rec.count++;
  return { ok: true, remaining: RATE_LIMIT_MAX - rec.count };
}

// CSRF protection using double-submit cookie pattern
export function requireCsrf(request) {
  const csrfHeader = request.headers.get("x-csrf");
  const cookies = request.cookies;
  const csrfCookie = cookies?.get?.("csrf_token")?.value;
  return csrfHeader && csrfCookie && csrfHeader === csrfCookie;
}

// Standardized JSON response
export function respond(status, body, extraHeaders = {}) {
  return NextResponse.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "Pragma": "no-cache",
      ...extraHeaders,
    },
  });
}

// Extract client IP from headers
export function getClientIP(req) {
  const h = req.headers;
  return (
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    h.get("x-real-ip") ||
    "0.0.0.0"
  );
}

// Promise timeout wrapper
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
