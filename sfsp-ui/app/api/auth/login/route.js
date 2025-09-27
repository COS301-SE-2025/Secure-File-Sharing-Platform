import { NextResponse } from "next/server";
import { randomBytes, createHmac } from "crypto";

function makeCsrfToken(userId) {
  const nonce = randomBytes(32).toString("hex");
  const payload = `${userId}.${nonce}`;
  if (!process.env.CSRF_SECRET) {
    throw new Error("CSRF_SECRET environment variable is not set");
  }
  const sig = createHmac("sha256", process.env.CSRF_SECRET)
    .update(payload)
    .digest("base64url");
  return `${payload}.${sig}`;
}

export async function POST(request) {
  try {
    const body = await request.json();

    const backendResponse = await fetch(
      "http://localhost:5000/api/users/login",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      }
    );

    if (!backendResponse.ok) {
      const errorData = await backendResponse.json();
      return NextResponse.json(
        { success: false, message: errorData.message || "Login failed" },
        { status: backendResponse.status }
      );
    }

    const result = await backendResponse.json();

    if (result.success && result.data?.token) {
      const response = NextResponse.json({
        success: true,
        message: result.message,
        data: {
          user: result.data.user,
          keyBundle: result.data.keyBundle,
        },
      });

      response.cookies.set("auth_token", result.data.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        path: "/",
        maxAge: 60 * 60 * 1000,
      });
      
      const csrf = makeCsrfToken(result.data.user.id);
      response.cookies.set("csrf_token", csrf, {
        httpOnly: false, 
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        path: "/",
        maxAge: 60 * 60,
      });

      response.cookies.set("current_user", result.data.user.id, {
        httpOnly: false,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        path: "/",
        maxAge: 60 * 60 * 1000,
      });

      return response;
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Login proxy error:", error);
    return NextResponse.json(
      { success: false, message: "Authentication service unavailable" },
      { status: 500 }
    );
  }
}
