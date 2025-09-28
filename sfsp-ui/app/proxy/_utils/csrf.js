import { NextResponse } from "next/server";
import { createHmac } from "crypto";

const ALLOWED_ORIGINS = new Set([
  "http://localhost:3000",
  "https://SecureShare.co.za",
]);

function isStateChanging(method) {
  if (typeof method !== "string") return false;
  return ["POST", "PUT", "PATCH", "DELETE"].includes(method.toUpperCase());
}

function getOrigin(Request) {
  const origin = Request.headers.get("origin");
  if (origin) {
    return origin;
  }
  const referer = Request.headers.get("referer");
  if (referer) {
    try {
      const u = new URL(referer);
      return `${u.protocol}//${u.host}`;
    } catch {}
  }
  return null;
}

function verifySignedCsrf(token) {
  const parts = token.split(".");
  if (parts.length !== 3) {
    return false;
  }
  const [userId, nonce, sig] = parts;
  const payload = `${userId}.${nonce}`;
  const expected = createHmac("sha256", process.env.CSRF_SECRET)
    .update(payload)
    .digest("base64url");
  return sig === expected;
}

export function enforceCsrf(Request) {
  if (!isStateChanging(Request.method)) {
    return null;
  }

  //check origin first
  const originLike = getOrigin(Request);
  if (!originLike || !ALLOWED_ORIGINS.has(originLike)) {
    return NextResponse.json({ message: "Baf origin" }, { status: 403 });
  }

  //double submit check
  const header = Request.headers.get("x-csrf") || "";
  const cookie = Request.cookies?.get?.("csrf_token")?.value || "";
  
  if (!header || !cookie) {
	console.log("Missing CSRF token");
    return NextResponse.json(
      { message: "Missing CSRF token" },
      { status: 403 }
    );
  }

  if (cookie !== header || !verifySignedCsrf(cookie)) {
	console.log("CSRF validation failed");
    return NextResponse.json(
      { message: "CSRF validation failed" },
      { status: 403 }
    );
  }

  return null;
}
