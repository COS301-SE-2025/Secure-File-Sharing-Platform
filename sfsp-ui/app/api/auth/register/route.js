import { NextResponse } from "next/server";

export async function POST(request) {
  try {
    const body = await request.json();

    const backendResponse = await fetch(
      "http://localhost:5000/api/users/register",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }
    );

    if (!backendResponse.ok) {
      const errorData = await backendResponse.json();
      return NextResponse.json(
        { success: false, message: errorData.message || "Register failed" },
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

      response.cookies.set("current_user", result.data.user.id, {
        httpOnly: false,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        path: "/",
        maxAge:  60 * 60 * 1000,
      });

      return response;
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Register proxy error:", error);
    return NextResponse.json(
      { success: false, message: "Authentication service unavailable" },
      { status: 500 }
    );
  }
}
