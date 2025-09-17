import { NextResponse } from "next/server";

export const runtime = "nodejs";

// Configuration constants
export const CONFIG = {
  MAX_UPLOAD_BYTES: 2 * 1024 * 1024 * 1024,
  RATE_LIMIT: {
    WINDOW_MS: 60_000, 
    MAX_REQUESTS: 30,
    CLEANUP_INTERVAL_MS: 5 * 60_000, 
  },
  TIMEOUT_MS: 30_000,
};

const API_ROUTES = {
  FILES: [
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
  ],
  NOTIFICATIONS: [
    "/api/notifications/add",
    "/api/notifications/clear",
    "/api/notifications/getNotifications",
    "/api/notifications/markAsRead",
    "/api/notifications/respond",
  ],
  USER: [
    "/api/user/addUser",
    "/api/user/getUserById",
    "/api/user/getUserId",
    "/api/user/getUserInfo",
    "/api/user/public-keys",
  ],
};

export const ALLOWED_PATHS = new Set([
  ...API_ROUTES.FILES,
  ...API_ROUTES.NOTIFICATIONS,
  ...API_ROUTES.USER,
]);

class RateLimiter {
  constructor() {
    this.store = new Map();
    this.cleanupTimer = null;
    this.startCleanup();
  }

  startCleanup() {
    this.cleanupTimer = setInterval(() => {
      const now = Date.now();
      for (const [key, record] of this.store.entries()) {
        if (now > record.resetAt) {
          this.store.delete(key);
        }
      }
    }, CONFIG.RATE_LIMIT.CLEANUP_INTERVAL_MS);
  }

  limit(key) {
    const now = Date.now();
    const record = this.store.get(key);

    if (!record || now > record.resetAt) {
      const resetAt = now + CONFIG.RATE_LIMIT.WINDOW_MS;
      this.store.set(key, { count: 1, resetAt });
      return {
        ok: true,
        remaining: CONFIG.RATE_LIMIT.MAX_REQUESTS - 1,
        resetAt,
      };
    }

    if (record.count >= CONFIG.RATE_LIMIT.MAX_REQUESTS) {
      return {
        ok: false,
        remaining: 0,
        resetAt: record.resetAt,
      };
    }

    record.count++;
    return {
      ok: true,
      remaining: CONFIG.RATE_LIMIT.MAX_REQUESTS - record.count,
      resetAt: record.resetAt,
    };
  }

  destroy() {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
    this.store.clear();
  }
}

const rateLimiter = new RateLimiter();

export function isAllowedPath(path) {
  const normalizedPath = path.replace(/\/$/, "");
  return ALLOWED_PATHS.has(normalizedPath);
}

export function rateLimit(key) {
  return rateLimiter.limit(key);
}

export function respond(status, body, extraHeaders = {}) {
  return NextResponse.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate",
      "Pragma": "no-cache",
      "Expires": "0",
      ...extraHeaders,
    },
  });
}

export function getClientIP(req) {
  const headers = req.headers;

  const ipSources = [
    headers.get("cf-connecting-ip"),
    headers.get("x-forwarded-for")?.split(",")[0]?.trim(),
    headers.get("x-real-ip"),
    headers.get("x-client-ip"),
    headers.get("x-forwarded"),
    headers.get("forwarded-for"),
    headers.get("forwarded"),
  ];

  for (const ip of ipSources) {
    if (ip && ip !== "unknown") {
      return ip;
    }
  }

  return "0.0.0.0";
}

export function withTimeout(promise, ms = CONFIG.TIMEOUT_MS, signal) {
  if (signal?.aborted) {
    return Promise.reject(new Error("Request already aborted"));
  }

  return Promise.race([
    promise,
    new Promise((_, reject) => {
      const timeoutId = setTimeout(() => {
        signal?.abort?.();
        reject(new Error(`Operation timed out after ${ms}ms`));
      }, ms);

      promise.finally(() => clearTimeout(timeoutId));
      signal?.addEventListener("abort", () => clearTimeout(timeoutId));
    }),
  ]);
}

export function enforceSecurity(request, options = {}) {
  try {
    const url = new URL(request.url);
    const path = url.pathname;

    if (!isAllowedPath(path)) {
      console.warn(`Blocked access to disallowed path: ${path}`);
      return respond(403, {
        error: "Forbidden",
        message: "Path not allowed",
      });
    }

    if (options.skipRateLimit) {
      return null;
    }

    const token = request.headers.get("cookie")
      ?.split(";")
      .find((c) => c.trim().startsWith("auth_token="))
      ?.split("=")[1];

    const ip = getClientIP(request);
    const rateKey = options.useTokenRateLimit && token ? `token:${token}` : `ip:${ip}`;

    const rateResult = rateLimit(rateKey);
    if (!rateResult.ok) {
      const retryAfter = rateResult.resetAt
        ? Math.ceil((rateResult.resetAt - Date.now()) / 1000)
        : 60;

      console.warn(`Rate limit exceeded for ${rateKey}`);
      return respond(
        429,
        {
          error: "Too Many Requests",
          message: "Rate limit exceeded",
          retryAfter,
        },
        {
          "Retry-After": retryAfter.toString(),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": rateResult.resetAt?.toString() || "",
        }
      );
    }

    return respond(200, { success: true }, {
      "X-RateLimit-Remaining": rateResult.remaining.toString(),
      "X-RateLimit-Reset": rateResult.resetAt?.toString() || "",
    });

  } catch (error) {
    console.error("Security enforcement error:", error);
    return respond(500, {
      error: "Internal Server Error",
      message: "Security check failed",
    });
  }
}

export function cleanup() {
  rateLimiter.destroy();
}

export { rateLimiter };
